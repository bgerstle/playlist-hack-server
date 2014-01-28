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
        variety: 0.35,
        min_energy: 0.4,
        min_danceability: 0.3,
        target_song_hotttnesss: 0.6,
        target_artist_hotttnesss: 0.6,
        target_tempo: 140
};

var playlist = new EchoNest.StaticPlaylist([], {
    playlistParams: _.defaults({
        type: 'artist-radio',
        artist: 'Jamiroquai'
    }, defaultParams),
    reset: true,
    silet: false
});

playlist.deferredFetch().always(function (collection, response, options) {
    console.log("fetch response: " + response);
    console.log(collection.toJSON());
});

var SongList = Backbone.View.extend({
    initialize: function (attrs, options) {
        this.model.on('sync', this.render.bind(this));

        // perhaps do something w/ the router..?
        this.$el.on('click a', function (e) {
            e.preventDefault();
            var modelID = $(e.target).attr('modelID');
            var trackID = this.model.get(modelID).getSpotifyTrackID();
            playbuttonModel.set("tracks", [trackID]);
        }.bind(this));
    },
    template: function () {
        return _.template($('#playlist-template').html(), {songs: this.model.toJSON()});
    },
    render: function () {
        this.$el.html(this.template());
    }
});

var defaultList = new SongList({
    el: $('#playlist'),
    model: playlist
});
defaultList.render();

});