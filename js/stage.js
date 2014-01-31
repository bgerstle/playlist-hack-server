(function () {

var root = this;
var Stage = root.Stage = {};

///
/// Stage
///

Stage.Model = Backbone.Model.extend({
  initialize: function (attributes, options) {
    this.playlist = _.result(options, "playlist");
    if (!this.playlist) {
      this.playlist = new EchoNest.StaticPlaylist([], {
        comparator: function(a, b) {
        // sort by song energy, descending
        return b.get("audio_summary").energy - a.get("audio_summary").energy;
        }
      });
    }
    this.playlist.on('all', this.playlistEventTrampoline, this);
  },
  playlistEventTrampoline: function (eventName) {
    var args = _.toArray(arguments).slice(1);
    // namespace the playlist event name, and add this as an argument
    var namespacedEventName = 'playlist:'.concat(eventName);
    args.unshift(namespacedEventName, this);
    this.trigger.apply(this, args);
  },
  getSelectedSongs: function () {
    return this.playlist.where({selected: true});
  },
  getDuration: function () {

  }
});

Stage.View = Backbone.View.extend({
  className: "stage",
  initialize: function (options) {
	  // technically this should be done in render...
	this.$el.addClass(this.model.get("className"));

    this.model.on('change', this.render, this);
    this.render();

    // render subviews
    var form = new Search.SearchFormView({
      el: this.$('.search-form'),
      model: this.model.playlist,
      searchDefaults: this.model.get("searchDefaults")
    });
    form
    .$(".search-type select option[value='artist']")
    .attr("selected", true);
    form.addField();

    var searchResultsView = new Search.SearchResultListView({
      el: this.$('.search-results'),
      model: this.model.playlist,
      searchView: form
    });
    searchResultsView.render();
    var $loadingIndicator = this.$('.loadingIndicator');
    form.on({
      'search:started': $loadingIndicator.fadeIn,
      'search:finished search:failed': $loadingIndicator.fadeOut
    }, $loadingIndicator);
  },
  template: function () {
    return _.template($('#stage-template').html(),
                      this.model.pick('title', 'subtitle', 'index'));
  },
  render: function () {
    this.$el.html(this.template());
    this.$el.attr("data-id", this.model.cid);
    this.$el.attr("data-sortby"), this.model.get("index");
  }
});

///
/// Container
///

Stage.Collection = Backbone.Collection.extend({
  model: Stage.Model,
  comparator: "index",
  getLastIndex: function () {
    return this.last().get("index");
  },
  append: function (modelOrModels) {
    var models = typeof modelOrModels === 'array' ? modelOrModels : [modelOrModels];
    var lastIndex = this.getLastIndex();
    _.each(models, function (model) {
      lastIndex++;
      model.set("index", lastIndex);
    });
    this.add(models);
  },
  getSelectedSongs: function () {
    return _.chain(this.models)
    .map(function (stage) {
      // get selected songs, grouped by stage
      return stage.getSelectedSongs();
    })
    .flatten()
    .value();
  }
});

Stage.ContainerView = Backbone.View.extend({
  initialize: function (options) {
    this.model.on('add', this.modelAdded, this);
    this.model.on('remove', this.modelRemoved, this);
    this.model.on('sort', this.sortSubviews, this);
    this.subviews = {};
  },
  modelAdded: function (model, collection, options) {
    var subview = new Stage.View({
      model: model
    });
    this.subviews[model.cid] = subview;
  },
  modelRemoved: function (model, collection, options) {
    var subview = this.subviews[model.cid];
    if (!subview) {
      return;
    }
    delete this.subviews[model.cid];
    subview.remove();
  },
  sortSubviews: function () {
    var $sortedChildElements = _.chain(this.subviews)
    .values()
    .pluck("$el")
    .sortBy(function ($el) {
      return $el.data('sortby');
    })
    .value();

    this.$el.append($sortedChildElements);

    var width = 0;
    if (_.size($sortedChildElements) > 0) {
     width = $sortedChildElements[0].outerWidth(true);
   }
   // add width of "add stage button"
   this.$el.css("width", (_.size(this.subviews) * width) + 200);
 }
});

///
/// Picker
///

var baseSearchDefaults = {
  sort: 'energy-desc',
  song_selection: 'energy-top',
  song_type: 'studio',
  results: 50,
  target_song_hotttnesss: 0.3,
  target_artist_hotttnesss: 0.3
};

Stage.PredefinedModelAttributes = {
  warmup: {
    title: 'Warm Up',
    subtitle: 'Loosen up with a light, upbeat song.',
    searchDefaults: _.defaults({
      min_energy: 0.2,
      target_energy: 0.6,
      min_tempo: 50,
      target_tempo: 110,
      max_tempo: 140,
      min_danceability: 0.2,
      target_danceability: 0.6
    }, baseSearchDefaults),
    className: 'warmup'
  },
  sprint: {
    title: 'Sprint',
    subtitle: 'Put your pedals to the metal!',
    searchDefaults: _.defaults({
      min_energy: 0.7,
      min_tempo: 110,
      min_danceability: 0.7
    }, baseSearchDefaults),
    className: 'sprint'
  },
  climb: {
    title: 'Climb',
    subtitle: 'Feel the burn, all the way to the top.',
    searchDefaults: _.defaults({
      min_energy: 0.1,
      min_tempo: 40,
      max_tempo: 100,
      min_danceability: 0.2
    }, baseSearchDefaults),
    className: 'climb'
  },
  cool_down: {
    title: 'Cool Down',
    subtitle: 'Time to recover.',
    searchDefaults: _.defaults({
      min_energy: 0.3,
      min_tempo: 60,
      max_tempo: 110,
      min_danceability: 0.4
    }, baseSearchDefaults),
    className: 'cool-down'
  }
};

Stage.PredefinedModelFactory = function (key) {
  if (!_.has(Stage.PredefinedModelAttributes, key)) {
    throw "No predefined stage model for key: " + key;
  }
  return new Stage.Model(Stage.PredefinedModelAttributes[key]);
};

Stage.PickerView = Backbone.View.extend({
  initialize: function (options) {
  },
  events: {
    'change select': 'selectChanged'
  },
  template: function () {
    return _.template($('#stage-picker-template').html(), {
      options: Stage.PredefinedModelAttributes
    });
  },
  render: function () {
    this.$('select').append(this.template());
  },
  selectChanged: function (event) {
    var selectedModelKey = $(event.target).val();
    this.trigger('select', selectedModelKey);
  }
});

})(this);
