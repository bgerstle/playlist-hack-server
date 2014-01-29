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

var defaultParams = {
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
  } else {
	  $(this).next('.song-summary-container').removeClass('selected');
  }

}

/////////////////////////////////////
// Declare main classes for the UI...
/////////////////////////////////////

/*
 View which contains controls which allow the user to specify parameters for
 and execute a search.
 */
var SearchFormView = Backbone.View.extend({
    initialize: function (opts) {
        this.$addField = this.$('.addField');
        this.$removeField = this.$('.removeField');
        this.$fieldContainer = this.$('.searchFieldContainer');
        this.maxFields = opts && opts.maxFields ? opts.maxFields : 5;
    },
    events: function () {
        return {
            'click .addField': 'addField',
            'click .removeField': 'removeField',
            'keypress input.searchField': 'searchFieldChanged',
            "click button[name='search']": 'search'
        };
    },

    searchFieldChanged: function (event) {
        if (event.which === 13) {
            event.preventDefault();
            this.search();
        }
    },
    getSearchFields: function () {
        return this.$fieldContainer.find("input.searchField");
    },
    addField: function (event) {
        var $existingFields = this.getSearchFields();
        var numFields = $existingFields.size();
        if (numFields === this.maxFields) {
            return;
        }

        var $newField = $existingFields.first().clone();
        $newField.val('');
        this.$fieldContainer.append($newField);
        numFields++;

        if (numFields === this.maxFields) {
            this.$addField.prop('disabled', true);
        }
        if (numFields >= 1) {
            this.$removeField.prop('disabled', false);
        }
    },
    removeField: function(event) {
        var $existingFields = this.getSearchFields();
        var numFields = $existingFields.size();
        if (numFields === 1) {
            return;
        }

        $existingFields.last().detach();
        numFields--;

        if (numFields < 2) {
            // going down to 1 field, don't remove more
            this.$removeField.prop('disabled', true);
        } else if (numFields < this.maxFields) {
            // removing the 5th field, enable addition
            this.$addField.prop('disabled', false);
        }
    },
    getSearchType: function () {
        return this.$(":checked[name='type']").val();
    },
    getSeedKeyForSearchType: function (type) {
        var seedFieldName;
        switch (type) {
          case 'artist':
          case 'artist-radio':
            return 'artist';
          case 'genre-radio':
            return 'genre';
          default:
            throw "Unexpected search type: " + type;

        }
    },
    getEncodedSeedValues: function () {
        return _.map(this.$("input.searchField"), function (el) {
            return encodeURIComponent($(el).val());
        });
    },
    serialize: function () {
        var params = {type: this.getSearchType()};
        var seedFieldName = this.getSeedKeyForSearchType(params.type);
        params[seedFieldName] = this.getEncodedSeedValues();
        return params;
    },
    search: function (e) {
        var params = _.defaults(this.serialize(), defaultParams);
        this.trigger('search:started', params);
        return this.model.deferredFetch({
            playlistParams: params,
            reset: true,
            silet: false
        }).done(function (collection, response, options) {
            this.trigger('search:finished');
            console.log("fetch response:");
            console.log(response);
        }.bind(this))
        .fail(function (collection, response, options) {
            this.trigger('search:failed');
            alert(JSON.stringify(response));
        }.bind(this));
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
            'click a': 'preview'
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
    el: $('#warmup > .search'),
    model: defaultPlaylist
});
defaultSearchView.render();
defaultSearchView.search();

var searchResultsView = new SearchResultView({
    el: $('#warmup > .searchResults'),
    model: defaultPlaylist,
    searchView: defaultSearchView
});
searchResultsView.render();

var $loadingIndicator = $('.loadingIndicator');
defaultSearchView.on('search:started', $loadingIndicator.fadeIn, $loadingIndicator);
defaultSearchView.on('search:finished search:failed', $loadingIndicator.fadeOut, $loadingIndicator);

});