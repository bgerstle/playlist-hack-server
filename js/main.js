(function () {
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
      tracksetDetection: false
    });
    var playlistButtonView = new PlayButtonView({
      model: playlistButtonModel
    });
    playlistButtonView
    $('#rightSidebar').append(playlistButtonView.el);

    Stage
    .getGlobalSelectionsModel()
    .on('add remove',
        function (song, collection, options) {
          playlistButtonModel.set("tracks", collection.map(function (model) {
            return model.getSpotifyTrackID();
          }));
        });
  });
})(this);
