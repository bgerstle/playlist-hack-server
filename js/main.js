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

function showSongSummary(e) {
    if (!$(this).next('.song-summary-container').hasClass('selected')) {
        $(this).next('.song-summary-container').addClass('selected');
        $(this).html('-').css('padding', '0px 8px');
    } else {
        $(this).next('.song-summary-container').removeClass('selected');
        $(this).html('+').css('padding', '0px 7px');
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
        this.render();
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

/*
 Lists the responses for a specific search.
 */
var SearchResultView = Backbone.View.extend({
    initialize: function (options) {
        // re-render when collection syncs
        this.model.on('sync', this.render.bind(this));
    },
    template: function () {
        return _.template($('#searchResults-template').html(), {songs: this.model.toJSON()});
    },
    render: function () {
        this.$el.html(this.template());
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
    el: $('#warmup .search'),
    model: defaultPlaylist
});
defaultSearchView.render();

var searchResultsView = new SearchResultView({
    el: $('#warmup .searchResults'),
    model: defaultPlaylist,
    searchView: defaultSearchView
});
searchResultsView.render();

var $loadingIndicator = $('.loadingIndicator');
defaultSearchView.on('search:started', $loadingIndicator.fadeIn, $loadingIndicator);
defaultSearchView.on('search:finished search:failed', $loadingIndicator.fadeOut, $loadingIndicator);

});