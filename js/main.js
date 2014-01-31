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

    Stage.getGlobalSelectionsModel().on({
      add: function (song, collection, options) {
        console.log('song added to global selections model!');
        console.log(song);
      },
      remove: function (song, collection, options) {
        console.log('song removed from global selections model!');
        console.log(song);
      }
    });
  });
})(this);
