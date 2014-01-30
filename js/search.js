(function () {

var root = this.exports || this;

var Search = root.Search = {};

Search.DefaultParams = function () {
  return _.clone({
    sort: 'energy-desc',
    song_selection: 'energy-top',
    song_type: 'studio',
    results: 50,
    variety: 0.1,
    min_energy: 0.2,
    min_danceability: 0.4,
    target_song_hotttnesss: 0.8,
    target_artist_hotttnesss: 0.6,
    target_tempo: 60
  });
};

/*
 View which accepts text from the user that specifies an artist or genre seed
 */
Search.ArtistGenreSearchField = Backbone.View.extend({
  tagName: "input",
  className: "searchField",
  attributes: {
    type: "text"
  },
  serialize: function () {
    return this.$el.val();
  }
});

/*
 View which contains controls which allow the user to specify parameters for
 and execute a search.
 */
Search.BaseSearchFormView = Backbone.View.extend({
  searchFieldFactory: function () {
    return new Search.ArtistGenreSearchField();
  },
  initialize: function (opts) {
    this.resultSubviews = [];
    this.$addFieldButton = this.$('button.addField');
    this.$removeFieldButton = this.$('button.removeField');
    this.$fieldContainer = this.$('.searchFieldContainer');
    this.$searchButton = this.$('button.search');
    this.maxFields = 5;
  },
  events: function () {
    return {
      'change .searchType select': 'searchTypeChanged',
      'click .addField': 'addField',
      'click .removeField': 'removeField',
      'keyup input.searchField': 'searchFieldChanged',
      "click button.search": 'search'
    };
  },
  reset: function () {
    _.invoke(this.resultSubviews, 'remove');
    this.resultSubviews = [];
  },
  render: function () {
    // skip any resultSubviews we've already appended
    _.each(this.resultSubviews, _.bind(function (subview) {
      if ($.contains(this.$fieldContainer, subview.el)) {
        return;
      }
      this.$fieldContainer.append(subview.$el);
    }, this));

    this.$addFieldButton.prop("disabled", this.resultSubviews.length === this.maxFields);
    this.$removeFieldButton.prop("disabled", this.resultSubviews.length <= 1);
    this.$searchButton.prop("disabled", this.resultSubviews.length === 0);
  },
  searchTypeChanged: function (event) {
    this.reset();
    this.addField();
  },
  searchFieldChanged: function (event) {
    if (event.which === 13) {
      event.preventDefault();
      this.search();
      return false;
    }
    return true;
  },
  addField: function (event) {
    if (this.resultSubviews.length === this.maxFields) {
      return;
    }

    var newSubview = _.result(this, "searchFieldFactory");
    newSubview.render();
    this.resultSubviews.push(newSubview);
    this.render();
  },
  removeField: function(event) {
    if (this.resultSubviews.length === 1) {
      return;
    }

    var lastSubview = this.resultSubviews.pop();
    lastSubview.remove();
    this.render();
  },
  getSearchType: function () {
    return this.$(":checked[name='type']").val();
  },
  getSearchTypeToSeedKeyMap: function () {
    return {
      'artist': 'artist',
      'artist-radio': 'artist',
      'genre-radio': 'genre'
    };
  },
  getSeedKeyForSearchType: function (type) {
    var seedFieldName;
    var map = this.getSearchTypeToSeedKeyMap();
    if (_.has(map, type)) {
      return map[type];
    }
    throw "Unexpected search type: " + type;
  },
  encodeSeedValue: function (value) {
    return encodeURIComponent(value);
  },
  getEncodedSeedValues: function () {
    return _.chain(this.resultSubviews).map(function (subview) {
      return subview.serialize();
    }).map(this.encodeSeedValue).value();
  },
  serialize: function () {
    var params = {type: this.getSearchType()};
    var seedFieldName = this.getSeedKeyForSearchType(params.type);
    params[seedFieldName] = this.getEncodedSeedValues();
    return params;
  },
  search: function (e) {
    var params = _.defaults(this.serialize(), Search.DefaultParams);
    this.trigger('search:started', params);
    return this.model.deferredFetch({
      playlistParams: params,
      reset: true,
      silet: false
    }).done(_.bind(function (collection, response, options) {
      this.trigger('search:finished');
      console.log("fetch response:");
      console.log(response);
    }, this))
    .fail(_.bind(function (collection, response, options) {
      this.trigger('search:failed');
      alert(JSON.stringify(response));
    }, this));
  }
});

Search.SongSearchField = Search.ArtistGenreSearchField.extend({
  initialize: function (opts) {
    _.bindAll(this, 'autoCompleteSourceCallback', 'autoCompleteSelected');
    this.model.comparator = function (a, b) {
      return b.get("song_hotttnesss") - a.get("song_hotttnesss");
    };
    this.$el.autocomplete({
      delay: 500,
      source: this.autoCompleteSourceCallback,
      select: this.autoCompleteSelected
    });
  },
  autoCompleteSourceCallback: function (request, callback) {
    this.model.deferredFetch({
      songParams: {
        combined: encodeURIComponent(request.term),
        bucket: 'song_hotttnesss'
      },
      reset: true,
      silent: false
    }).done(function (collection, json, options) {
      callback(collection.map(function (model) {
        return {
          value: model.get("title") + " by " + model.get('artist_name'),
          data_id: model.get("id")
        };
      }));
    });
  },
  autoCompleteSelected: function (event, ui) {
    event.preventDefault();
    this.$el.val(ui.item.label);
    this.$el.attr("data-id", ui.item.data_id);
    return false;
  },
  serialize: function () {
    return this.$el.attr("data-id");
  }
});

Search.SearchFormView = Search.BaseSearchFormView.extend({
  searchFieldFactory: function () {
    if (this.getSearchType() !== 'song-radio') {
      return Search.BaseSearchFormView.prototype.searchFieldFactory.call(this);
    }

    return new Search.SongSearchField({
      model: new EchoNest.SearchSongModel()
    });
  },
  initialize: function (opts) {
    Search.BaseSearchFormView.prototype.initialize.call(this, opts);
    this.maybeValidateSearchField = _.debounce(this.maybeValidateSearchField, 500);
    this.songSearches = {};
    this.songIDs = [];
  },
  getSearchTypeToSeedKeyMap: function () {
    return _.extend(Search.BaseSearchFormView.prototype.getSearchTypeToSeedKeyMap.call(this), {
      'song-radio': 'song_id'
    });
  }
});

Search.SearchResultView = Backbone.View.extend({
  tagName: 'li',
  className: 'searchResult',
  initialize: function (opts) {
    this.playButton = new PlayButtonView({
      model: new PlayButtonModel()
    });

    this.$playButtonContainer = $('<div class="iframe-container"></div>');
    this.playButton.$el.appendTo(this.$playButtonContainer);
  },
  template: function () {
    return _.template($("#searchResult-template").html(), this.model.toJSON());
  },
  render: function () {
    // !!!: this is awful
    this.$el.html(this.template());
    this.$el.append(this.$playButtonContainer);
  },
  isVisible: function () {
    return this.$el.position().top >= 0 && this.$el.position().top < this.$el.parent().height();
  },
  renderPlayButton: function () {
    if (this.playButton.model.has("tracks")) {
      return;
    }
    this.playButton.model.set("tracks", [this.model.getSpotifyTrackID()]);
  }
});

/*
Lists the responses for a specific search.
*/
Search.SearchResultListView = Backbone.View.extend({
  initialize: function (options) {
    _.bindAll(this, 'didScroll', 'checkVisibleSubviews', 'didStopScrolling');
      // re-render when collection syncs
      this.model.on('sync', this.render, this);
      this.pollingInterval = 1000;
      this.$el.scroll(this.didScroll);
  },
  remove: function () {
    clearInterval(this.scrollPoll);
  },
  template: function () {
    return _.template($('#searchResultList-template').html(), {songs: this.model.toJSON()});
  },
  render: function () {
    // remove subviews manually in case they need to do any cleanup
    _.invoke(this.resultSubviews, "remove");

    // apply template
    this.$el.html(this.template());

    // get results container
    var $results = this.$(".results");

    // append result subviews to results container
    this.resultSubviews = this.model.map(_.bind(function (song) {
      var subview = new Search.SearchResultView({
        model: song
      });
      subview.render();
      subview.$el.appendTo($results);
      return subview;
    }, this));

    // act on visible subviews
    this.checkVisibleSubviews();
  },
  didScroll: function (e) {
    if (!_.has(this, "scrollPoll")) {
      this.scrollPoll = setInterval(this.checkVisibleSubviews, this.pollingInterval);
    }
  },
  didStopScrolling: function () {
    if (!_.has(this, "lastScrollPosition")) {
      this.lastScrollPosition = this.$el.scrollTop();
      return false;
    } else if (this.$el.scrollTop() === this.lastScrollPosition) {
      return true;
    }
    this.lastScrollPosition = this.$el.scrollTop();
    return false;
  },
  checkVisibleSubviews: function () {
    if (this.didStopScrolling()) {
      clearInterval(this.scrollPoll);
      delete this.scrollPoll;
    }
    var firstVisibleSubview = -1;
    var lastVisibleSubview = -1;
    for (var i = 0; i < this.resultSubviews.length; i++) {
      if (!this.resultSubviews[i].isVisible()) {
        if (firstVisibleSubview >= 0) {
          break;
        }
        continue;
      }
      if (firstVisibleSubview < 0) {
        firstVisibleSubview = i;
      }
      lastVisibleSubview = i;
    }
    if (firstVisibleSubview < 0) {
      return;
    }
    var visibleSubviews = this.resultSubviews.slice(firstVisibleSubview, lastVisibleSubview + 1);
    console.log("rendering play buttons for subviews " + _.first(visibleSubviews).model.get("title") + " to " + _.last(visibleSubviews).model.get("title"));
    _.invoke(visibleSubviews, "renderPlayButton");
  },
  events: function () {
    return {
      'click a.song-result': 'preview'
    };
  },
  preview: function (e) {
    e.preventDefault();
    var modelID = $(e.target).attr('modelID');
    var trackID = this.model.get(modelID).getSpotifyTrackID();
    playbuttonModel.set("tracks", [trackID]);
  }
});
})(this);
