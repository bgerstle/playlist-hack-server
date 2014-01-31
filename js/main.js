(function () {
  "use strict";
  $().ready(function() {

    // setup stages
    var stages = new Stage.Collection();
    var stageViews = new Stage.ContainerView({
      el: $('#stage-container'),
      model: stages
    });

    // setup stage picker
    var stagePicker = new Stage.PickerView({
      el: $('.stage-picker')
    });
    stagePicker.on('select', function (modelKey) {
      var selectedStage = Stage.PredefinedModelFactory(modelKey);
      stages.append(selectedStage);
    });
    stagePicker.render();

    // initial app w/ default stage
    var defaultStage = Stage.PredefinedModelFactory('warmup');
    defaultStage.set("index", 0);
    stages.add(defaultStage);

    var playlistButtonModel = new PlayButtonModel({
      theme: PlayButtonModel.SupportedParameters.theme.black,
      view: PlayButtonModel.SupportedParameters.view.list,
      tracksetDetection: false,
      title: "Workout Playlist",
      tracks: []
    });
    var playlistButtonView = new PlayButtonView({
      model: playlistButtonModel
    });
    playlistButtonView.render();
    $('#rightSidebar').append(playlistButtonView.el);

    stages
    .on('playlist:sort playlist:change:selected',
        function () {
          var newTracks = [];
          if (stages.length) {
            newTracks = _.chain(stages.models)
            .map(function (stage) {
              // get selected songs, grouped by stage
              return stage.getSelectedSongs();
            })
            .flatten()
            .map(function (song) {
              return song.getSpotifyTrackID();
            })
            .value();
          }
          playlistButtonModel.set("tracks", newTracks);
        });
  });
})(this);
