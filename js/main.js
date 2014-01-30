$().ready(function () {

var playbuttonModel = new PlayButtonModel();
var playbuttonView = new PlayButtonView({
    el: $('#preview'),
    id: 'preview',
    model: playbuttonModel
});

playbuttonModel.set({
    title: "",
    view: playbuttonModel.supportedParameters.view.coverArt,
    theme: playbuttonModel.supportedParameters.theme.white
});

$('body').append(playbuttonView.el);

var defaultPlaylistParams = {
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
};

// Nicole's Crap
$(document).delegate('.more-song-info', 'click', showSongSummary);
$(document).delegate('.search-container select', 'change', updateSelectUI);

// Update Hover on Select Y DOES IT HAVE TO BE THIS WAY JQUERY
/* var selectIsFocus = false; */
$('.searchType').mouseover(function(e) {
	$(e.target).addClass('hover');
}).mouseout(function(e) {
  $(e.target).removeClass('hover');
});

function showSongSummary(e) {
    if (!$(this).next('.song-summary-container').hasClass('selected')) {
        $(this).next('.song-summary-container').addClass('selected');
        $(this).html('-').css('padding', '0px 8px');
    } else {
        $(this).next('.song-summary-container').removeClass('selected');
        $(this).html('+').css('padding', '0px 7px');
    }
}

function updateSelectUI(e) {
  $('.searchType').removeClass('hover');

  var selectedText = $('.search-container select').find(":selected").text();

	if (selectedText === 'Artist' || selectedText === 'Genre') {
		$('.searchType').addClass('moveArrowDown');
	} else {
		$('.searchType').removeClass('moveArrowDown');
	}

}

$('.searchResults').css('height', $(window).height() - 300);

/////////////////////////////////////
// Declare main classes for the UI...
/////////////////////////////////////

 /*
  View which accepts text from the user that specifies an artist or genre seed
 */
 var ArtistGenreSearchField = Backbone.View.extend({
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
var BaseSearchFormView = Backbone.View.extend({
    searchFieldFactory: function () {
        return new ArtistGenreSearchField();
    },
    initialize: function (opts) {
        this.subviews = [];
        this.$addFieldButton = this.$('button.addField');
        this.$removeFieldButton = this.$('button.removeField');
        this.$fieldContainer = this.$('.searchFieldContainer');
        this.$searchButton = this.$('button.search');
        this.maxFields = 5;
    },
    events: function () {
        return {
            'change select.searchType': 'searchTypeChanged',
            'click .addField': 'addField',
            'click .removeField': 'removeField',
            'keyup input.searchField': 'searchFieldChanged',
            "click button.search": 'search'
        };
    },
    reset: function () {
        _.invoke(this.subviews, 'remove');
        this.subviews = [];
    },
    render: function () {
        // skip any subviews we've already appended
        _.each(this.subviews, _.bind(function (subview) {
            if ($.contains(this.$fieldContainer, subview.el)) {
                return;
            }
            this.$fieldContainer.append(subview.$el);
        }, this));

        this.$addFieldButton.prop("disabled", this.subviews.length === this.maxFields);
        this.$removeFieldButton.prop("disabled", this.subviews.length <= 1);
        this.$searchButton.prop("disabled", this.subviews.length === 0);
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
        if (this.subviews.length === this.maxFields) {
            return;
        }

        var newSubview = _.result(this, "searchFieldFactory");
        newSubview.render();
        this.subviews.push(newSubview);
        this.render();
    },
    removeField: function(event) {
        if (this.subviews.length === 1) {
            return;
        }

        var lastSubview = this.subviews.pop();
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
        return _.chain(this.subviews).map(function (subview) {
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
        var params = _.defaults(this.serialize(), defaultPlaylistParams);
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

var SongSearchField = ArtistGenreSearchField.extend({
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
        this.$el.autocomplete._renderItem = function (ul, item) {
              return $( "<li>" )
                     .attr( "data-value", item.label )
                     .append( $( "<a>" ).text( item.label ) )
                     .appendTo( ul );
        };
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
                    label: model.get("title") + " by " + model.get('artist_name'),
                    value: model.get("id")
                };
            }));
        });
    },
    autoCompleteSelected: function (event, ui) {
        event.preventDefault();
        this.$el.val(ui.item.label);
        this.$el.attr("data-id", ui.item.value);
        return false;
    },
    serialize: function () {
        return this.$el.attr("data-id");
    }
});

var SearchFormView = BaseSearchFormView.extend({
    searchFieldFactory: function () {
        if (this.getSearchType() !== 'song-radio') {
            return BaseSearchFormView.prototype.searchFieldFactory.call(this);
        }

        return new SongSearchField({
            model: new EchoNest.SearchSongModel()
        });
    },
    initialize: function (opts) {
        BaseSearchFormView.prototype.initialize.call(this, opts);
        this.maybeValidateSearchField = _.debounce(this.maybeValidateSearchField, 500);
        this.songSearches = {};
        this.songIDs = [];
    },
    getSearchTypeToSeedKeyMap: function () {
        return _.extend(BaseSearchFormView.prototype.getSearchTypeToSeedKeyMap.call(this), {
            'song-radio': 'song_id'
        });
    }
});

var SearchResultView = Backbone.View.extend({
    tagName: 'li',
    initialize: function (opts) {
        this.playButton = new PlayButtonView({
            model: new PlayButtonModel()
        });
    },
    template: function () {
        return _.template($("#searchResult-template").html(), this.model.toJSON());
    },
    render: function () {
        // !!!: this is awful
        this.$el.html(this.template());
        // this.playButton.hide();
        this.$el.append(this.playButton.el);
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
var SearchResultListView = Backbone.View.extend({
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
        this.$el.html(this.template());
        this.subviews = this.model.map(_.bind(function (song) {
            var subview = new SearchResultView({
                model: song
            });
            subview.render();
            this.$el.append(subview.$el);
            return subview;
        }, this));
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
        for (var i = 0; i < this.subviews.length; i++) {
            if (!this.subviews[i].isVisible()) {
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
        var visibleSubviews = this.subviews.slice(firstVisibleSubview, lastVisibleSubview + 1);
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

///////////////////////////////
// Put all the pieces together
///////////////////////////////

var defaultPlaylist = new EchoNest.StaticPlaylist([],{
    comparator: function (a, b) {
        // sort by song energy, descending
        return b.get("audio_summary").energy - a.get("audio_summary").energy;
    }
});
var defaultSearchView = new SearchFormView({
    el: $('#warmup .search-container'),
    model: defaultPlaylist
});
defaultSearchView.addField();
defaultSearchView.subviews[0].$el.attr("value", "The Black Keys");
defaultSearchView.search();

var searchResultsView = new SearchResultListView({
    el: $('#warmup .searchResults'),
    model: defaultPlaylist,
    searchView: defaultSearchView
});
searchResultsView.render();

var $loadingIndicator = $('.loadingIndicator');
defaultSearchView.on('search:started', $loadingIndicator.fadeIn, $loadingIndicator);
defaultSearchView.on('search:finished search:failed', $loadingIndicator.fadeOut, $loadingIndicator);

});