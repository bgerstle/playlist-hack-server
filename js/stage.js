(function () {
var root = this;
var Stage = root.Stage = {};

Stage.Model = Backbone.Model.extend({
  initialize: function (attributes, options) {
    this.playlist = new EchoNest.StaticPlaylist([], {
      comparator: function(a, b) {
        // sort by song energy, descending
        return b.get("audio_summary").energy - a.get("audio_summary").energy;
      }
    });
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
    defaultSearchView.$(".search-type select option[value='song-radio']").attr("selected", true);
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
    return _.template($('#stage-template').html(), this.model.pick('title', 'subtitle', 'index'));
  },
  render: function () {
    this.$el.html(this.template());
    this.$el.attr("data-id", this.model.cid);
    this.$el.attr("data-sortby"), this.model.get("index");
  }
});

Stage.Collection = Backbone.Collection.extend({
  model: Stage.Model,
  comparator: "index"
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
  }
});
})(this);
