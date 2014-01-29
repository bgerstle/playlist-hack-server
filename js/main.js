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

var playlist = new EchoNest.StaticPlaylist([],{
    comparator: function (a, b) {
        return b.get("audio_summary").energy - a.get("audio_summary").energy;
    }
});

var SearchForm = Backbone.View.extend({
    initialize: function (opts) {
        this.$addField = this.$('#addField');
        this.$removeField = this.$('#removeField');
        this.$fieldContainer = this.$('#searchFieldContainer');
        this.maxFields = opts && opts.maxFields ? opts.maxFields : 5;
    },
    events: function () {
        return {
            'click #addField': 'addField',
            'click #removeField': 'removeField',
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
        this.trigger('searchStarted', params);
        return playlist.deferredFetch({
            playlistParams: params,
            reset: true,
            silet: false
        }).done(function (collection, response, options) {
            this.trigger('searchFinished');
            console.log("fetch response:");
            console.log(response);
        }.bind(this))
        .fail(function (collection, response, options) {
            this.trigger('searchFailed');
            alert(JSON.stringify(response));
        }.bind(this));
    }
});

var searchView = new SearchForm({
    el: $('#search'),
    model: playlist
});
searchView.render();
searchView.search();

var SongList = Backbone.View.extend({
    initialize: function (options) {
        // re-render when collection syncs
        this.model.on('sync', this.render.bind(this));
    },
    template: function () {
        return _.template($('#playlist-template').html(), {songs: this.model.toJSON()});
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

var defaultList = new SongList({
    el: $('#playlist'),
    model: playlist
});
defaultList.render();

});