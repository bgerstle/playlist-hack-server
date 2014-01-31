(function() {

var root = this.exports || this;

var Search = root.Search = {};

///
/// Search Parameters
///

/*
 View which accepts text from the user that specifies an artist or genre seed
 */
Search.ArtistGenreSearchField = Backbone.View.extend({
  tagName: "input",
  className: "searchField",
  attributes: {
    type: "text",
    placeholder: "Click here to begin searching!"
  },
  serialize: function() {
    return this.$el.val();
  }
});

/*
 Field which provides autocomplete suggestions for combined song title & artist.
*/
Search.SongSearchField = Search.ArtistGenreSearchField.extend({
  initialize: function(opts) {
    _.bindAll(this, 'autoCompleteSourceCallback', 'autoCompleteSelected');
    this.model.comparator = function(a, b) {
      return b.get("song_hotttnesss") - a.get("song_hotttnesss");
    };
  },
  autoCompleteSourceCallback: function(request, callback) {
    this.model.deferredFetch({
      songParams: {
        combined: encodeURIComponent(request.term),
        bucket: 'song_hotttnesss',
        song_type: 'studio'
      },
      remove: true,
      silent: false
    }).done(function(collection, json, options) {
      callback(collection.map(function(model) {
        return {
          value: model.get("title") + " by " + model.get('artist_name'),
          data_id: model.get("id")
        };
      }));
    });
  },
  autoCompleteSelected: function(event, ui) {
    event.preventDefault();
    this.$el.val(ui.item.label);
    this.$el.attr("data-id", ui.item.data_id);
    return false;
  },
  serialize: function() {
    return this.$el.attr("data-id");
  },
  render: function () {
    this.$el.autocomplete({
      appendTo: this.$el.parent(),
      delay: 500,
      source: this.autoCompleteSourceCallback,
      select: this.autoCompleteSelected
    });
  },
  remove: function () {
    Backbone.View.prototype.remove.call(this);
    if (_.has(this.$el, "autocomplete")) {
      this.$el.autocomplete.destroy();
    }
  }
});

Search.SearchTypeView = Backbone.View.extend({
  initialize: function(opts) {
    if (!opts || !opts.types) {
      throw "Must specify search types!";
    }
    this.searchTypes = opts.types;
  },
  events: {
    'change select': 'typeSelected',
    'mouseover select': 'didMouseOver',
    'mouseout select': 'didMouseOut'
  },
  typeSelected: function(event) {
    var selectedVal = $(event.target).val();
    if (this.searchTypes[selectedVal].text.length < 8) {
      this.$('select').addClass('moveArrowDown');
    } else {
      this.$('select').removeClass('moveArrowDown');
    }
    this.trigger('change', selectedVal);

    $(event.target).removeClass('hover');
  },
  didMouseOver: function (event) {
    $(event.target).addClass('hover');
  },
  didMouseOut: function (event) {
    $(event.target).removeClass('hover');
  },
  template: function() {
    return _.template($('#search-type-template').html(), {
      options: this.searchTypes
    });
  },
  render: function() {
    this.$el.html(this.template());
  },
  serialize: function() {
    var $selected = this.$(":selected");
    return {
      value: $selected.val(),
      seed: $selected.attr('name')
    };
  },
  select: function(type) {
    $("option[value='" + type + "']").prop("selected", true);
  }
});

///
/// Search Form
///

/*
 View which contains controls which allow the user to tweak and execute a search.
 */
Search.BaseSearchFormView = Backbone.View.extend({
  searchFieldFactory: function() {
    return new Search.ArtistGenreSearchField();
  },
  searchTypeFactory: function() {
    return {
       'artist-radio': {
          text: "Artist Radio",
          seed: 'artist'
       },
       'artist': {
          text: "Artist",
          seed: 'artist'
       },
       'genre-radio': {
          text: "Genre",
          seed: 'genre'
       }
    };
  },
  searchTypeViewFactory: function() {
    var types = _.result(this, "searchTypeFactory");
    return new Search.SearchTypeView({
      el: this.$('.search-type'),
      types: types
    });
  },
  initialize: function(opts) {
    this.searchDefaults = opts.searchDefaults;
    this.searchTypeView = _.result(this, "searchTypeViewFactory");
    this.searchTypeView.on('change', this.searchTypeChanged, this);
    // until search type is modelized, only render it once, otherwise the
    // select will always be reset
    this.searchTypeView.render();

    this.$fieldContainer = this.$('.searchFieldContainer');
    this.fieldViews = [];

    this.$addFieldButton = this.$('button.addField');
    this.$removeFieldButton = this.$('button.removeField');

    this.$searchButton = this.$('button.search');
    this.maxFields = 5;
  },
  events: function() {
    return {
      'click .addField': 'addField',
      'click .removeField': 'removeField',
      'keyup input.searchField': 'searchFieldChanged',
      "click button.search": 'search'
    };
  },
  reset: function() {
    _.invoke(this.fieldViews, 'remove');
    this.fieldViews = [];
  },
  render: function() {
    // skip any fieldViews we've already appended
    _.each(this.fieldViews, _.bind(function(subview) {
      if ($.contains(this.$fieldContainer, subview.el)) {
        return;
      }
      this.$fieldContainer.append(subview.$el);
      // render after being added to the DOM, otherwise autocomplete
      // isn't appended correctly
      subview.render();
    }, this));

    this.$addFieldButton.prop("disabled",
                              this.fieldViews.length === this.maxFields);
    this.$removeFieldButton.prop("disabled",
                                 this.fieldViews.length <= 1);
    this.$searchButton.prop("disabled",
                            this.fieldViews.length === 0);
  },
  searchTypeChanged: function(event) {
    this.reset();
    this.addField();
  },
  getSearchType: function() {
    return this.searchTypeView.serialize().value;
  },
  searchFieldChanged: function(event) {
    if (event.which === 13) {
      event.preventDefault();
      this.search();
      return false;
    }
    return true;
  },
  addField: function(event) {
    if (this.fieldViews.length === this.maxFields) {
      return;
    }
    var newSubview = _.result(this, "searchFieldFactory");
    newSubview.render();
    this.fieldViews.push(newSubview);
    this.render();
  },
  removeField: function (event) {
    if (this.fieldViews.length === 1) {
      return;
    }

    var lastSubview = this.fieldViews.pop();
    lastSubview.remove();
    this.render();
  },
  encodeSeedValue: function(value) {
    return encodeURIComponent(value);
  },
  getEncodedFieldValues: function() {
    return _.chain(this.fieldViews)
    .map(function(subview) {
      return subview.serialize();
    })
    .map(this.encodeSeedValue)
    .value();
  },
  serialize: function() {
    // TODO: modelize this so we can do validation
    var searchType = this.searchTypeView.serialize();
    var params = {type: searchType.value};
    params[searchType.seed] = this.getEncodedFieldValues();
    return params;
  },
  search: function(e) {
    var params = _.defaults(this.serialize(), this.searchDefaults);
    this.trigger('search:started', params);
    return this.model.deferredFetch({
      playlistParams: params,
      remove: true,
      silent: false
    }).done(_.bind(function(collection, response, options) {
      this.trigger('search:finished');
      console.log("fetch response:");
      console.log(response);
    }, this))
    .fail(_.bind(function(collection, response, options) {
      this.trigger('search:failed');
      alert(JSON.stringify(response));
    }, this));
  }
});

Search.SearchFormView = Search.BaseSearchFormView.extend({
  searchFieldFactory: function() {
    if (this.getSearchType() !== 'song-radio') {
      return Search.BaseSearchFormView.prototype.searchFieldFactory.call(this);
    }
    return new Search.SongSearchField({
      model: new EchoNest.SearchSongModel()
    });
  },
  searchTypeFactory: function() {
    return _.defaults({
      'song-radio': {
        text: "Song Radio",
        seed: 'song_id'
      }
    }, Search.BaseSearchFormView.prototype.searchTypeFactory.call(this));
  },
  initialize: function(opts) {
    Search.BaseSearchFormView.prototype.initialize.call(this, opts);
    this.maybeValidateSearchField = _.debounce(this.maybeValidateSearchField, 500);
    this.songSearches = {};
    this.songIDs = [];
  }
});

Search.SearchResultView = Backbone.View.extend({
  tagName: 'li',
  className: 'search-result',
  initialize: function(opts) {
    this.playButton = new PlayButtonView({
      model: new PlayButtonModel()
    });
    this.$playButtonContainer = $('<div class="iframe-container"></div>');
    this.playButton.$el.appendTo(this.$playButtonContainer);
    this.model.on('change:selected', this.updateSelectedState, this);
  },
  events: function () {
    return {
      'click': 'click',
      'click .more-song-info': 'showSongSummary'
    };
  },
  template: function() {
    return _.template($("#search-result-template").html(), this.model.toJSON());
  },
  render: function() {
    // !!!: this is awful
    this.$el.html(this.template());
    this.$el.append(this.$playButtonContainer);
    this.updateSelectedState(this.model, this.model.get("selected"));
    this.renderPlayButton();
  },
  click: function (event) {
    event.preventDefault();
    this.model.set("selected", !this.model.get("selected"));
    return false;
  },
  hide: function () {
    this.$el.hide();
  },
  show: function () {
    this.$el.show();
  },
  updateSelectedState: function (model, selected, options) {
    if (selected) {
      this.$el.attr("selected", true);
    } else {
      this.$el.removeAttr("selected");
    }
  },
  showSongSummary: function (e) {
    if (!this.$('.song-summary-container').hasClass('selected')) {
      this.$('.song-summary-container').addClass('selected');
      $(e.target).html('-').css('padding', '0px 8px');
    } else {
      this.$('.song-summary-container').removeClass('selected');
      $(e.target).html('+').css('padding', '0px 7px');
    }
  },
  isVisible: function($superview) {
    if (!this.$el.parent()) {
      return false;
    }
    return (this.$el.position().top >= 0) && (this.$el.position().top < $superview.height());
  },
  renderPlayButton: function() {
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
  initialize: function(options) {
    _.bindAll(this, 'didScroll', 'checkVisibleSubviews', 'didStopScrolling');
    // re-render when collection syncs
    this.model.on('sync', this.render, this);
    this.pollingInterval = 1000;
  },
  events: {
    'scroll': 'didScroll'
  },
  remove: function() {
    Backbone.View.prototype.remove.call(this);
    clearInterval(this.scrollPoll);
  },
  template: function() {
    return _.template($('#searchResultList-template').html(),
                      {songs: this.model.toJSON()});
  },
  render: function() {
    // remove subviews manually in case they need to do any cleanup
    _.invoke(this.resultSubviews, "remove");

    // apply template
    this.$el.html(this.template());

    // get results container
    var $results = this.$(".results");

    // append result subviews to results container
    this.resultSubviews = this.model.map(_.bind(function(song) {
      var subview = new Search.SearchResultView({
        model: song
      });
      subview.hide();
      return subview;
    }, this));

    $results.append(_.pluck(this.resultSubviews, '$el'));
    _.invoke(this.resultSubviews, "show");

    // act on visible subviews
    this.checkVisibleSubviews();
  },
  didScroll: function(e) {
    if (!_.has(this, "scrollPoll")) {
      this.scrollPoll = setInterval(this.checkVisibleSubviews, this.pollingInterval);
    }
  },
  didStopScrolling: function() {
    if (!_.has(this, "lastScrollPosition")) {
      this.lastScrollPosition = this.$el.scrollTop();
      return false;
    } else if (this.$el.scrollTop() === this.lastScrollPosition) {
      return true;
    }
    this.lastScrollPosition = this.$el.scrollTop();
    return false;
  },
  checkVisibleSubviews: function() {
    if (this.didStopScrolling()) {
      clearInterval(this.scrollPoll);
      delete this.scrollPoll;
    }
    var firstVisibleSubview = -1;
    var lastVisibleSubview = -1;
    for (var i = 0; i < this.resultSubviews.length; i++) {
      if (!this.resultSubviews[i].isVisible(this.$el)) {
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
    var visibleSubviews = this.resultSubviews.slice(firstVisibleSubview,
                                                    lastVisibleSubview + 1);
    // console.log(["rendering play buttons for subviews",
    //             _.first(visibleSubviews).model.get("title"),
    //             "to",
    //             _.last(visibleSubviews).model.get("title")].join(' '));
    var self = this;
    _.each(visibleSubviews, function (subview) {
      _.defer(function () {
        if (subview.isVisible(self.$el)) {
          subview.render();
        }
      });
    });
  }
});
})(this);
