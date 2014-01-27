$().ready(function () {

var playbuttonModel = new PlayButtonModel();
var playbuttonView = new PlayButtonView({
    id: 'playlist',
    model: playbuttonModel
});

playbuttonModel.set({
    title: "Default Playlist",
    view: playbuttonModel.supportedParameters.view.list,
    theme: playbuttonModel.supportedParameters.theme.black
});

$('body').append(playbuttonView.el);

var playlist = new EchoNest.StaticPlaylist([], {
    playlistParams: {
        sort: 'energy-desc',
        type: 'artist-radio',
        artist: 'Michael Jackson',
        song_selection: 'energy-top',
        song_type: 'studio',
        results: 50,
        variety: 0.35,
        target_energy: 0.7,
        min_danceability: 0.4
    },
    reset: true,
    silet: false
});

playlist.on('sync', function () {
    playbuttonModel.set("tracks", playlist.getSpotifyTrackIDs());
});

playlist.deferredFetch().always(function (collection, response, options) {
    console.log("fetch response: " + response);
    console.log(collection.toJSON());
});

});