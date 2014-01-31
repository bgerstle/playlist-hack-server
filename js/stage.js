(function () {

var root = this;
var Stage = root.Stage = {};

///
/// Global Song Selection
///

Stage.GlobalSelectionsModel = Backbone.Collection.extend({
  listenToSongsFromCollection: function (songCollection) {
    songCollection.on({
      'add': this.listenForSongSelection,
      'remove': this.stopListeningForSongSelection
    }, this);
  },
  listenForSongSelection: function (song) {
    this.listenTo(song, 'change:selected', this.addOrRemoveSong, this);
  },
  stopListeningForSongSelection: function (song) {
    this.stopListening(song);
  },
  addOrRemoveSong: function (song, selected, options) {
    // TODO: handle uniquing of songs?
    if (selected) {
      this.add(song);
    } else {
      this.remove(song);
    }
  }
});

var globalSelectionsModel = null;
Stage.getGlobalSelectionsModel = function () {
  if (!globalSelectionsModel) {
    globalSelectionsModel = new Stage.GlobalSelectionsModel();
  }
  return globalSelectionsModel;
};

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
    Stage.getGlobalSelectionsModel().listenToSongsFromCollection(this.playlist);
  }
});

Stage.View = Backbone.View.extend({
  className: "stage",
  initialize: function (options) {
    this.model.on('change', this.render, this);
    this.render();

    // render subviews
    var defaultSearchView = new Search.SearchFormView({
      el: this.$('.search-form'),
      model: this.model.playlist
    });
    defaultSearchView
    .$(".search-type select option[value='song-radio']")
    .attr("selected", true);
    defaultSearchView.addField();

    var searchResultsView = new Search.SearchResultListView({
      el: this.$('.search-results'),
      model: this.model.playlist,
      searchView: defaultSearchView
    });
    searchResultsView.render();
    var $loadingIndicator = this.$('.loadingIndicator');
    defaultSearchView.on('search:started',
                         $loadingIndicator.fadeIn,
                         $loadingIndicator);
    defaultSearchView.on('search:finished search:failed',
                         $loadingIndicator.fadeOut,
                         $loadingIndicator);
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

Stage.PredefinedModelAttributes = {
  warmup: {
    title: 'Warm Up',
    subtitle: 'Loosen up with a light, upbeat song.'
  },
  sprint: {
    title: 'Sprint',
    subtitle: 'Put your pedals to the metal!'
  },
  climb: {
    title: 'Climb',
    subtitle: 'Feel the burn, all the way to the top.'
  },
  cool_down: {
    title: 'Cool Down',
    subtitle: 'Time to recover.'
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
