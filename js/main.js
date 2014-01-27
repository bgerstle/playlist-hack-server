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
        artist: 'Michael+Jackson',
        song_selection: 'energy-top'
    }
});

playlist.deferredFetch().always(function (collection, response, data) {
    console.log("fetched playlist songs!");
    console.log(collection.toJSON());
    playbuttonModel.set("tracks", collection.getSpotifyTrackIDs());
});

});