(function () {
  $().ready(function() {
    var stages = new Stage.Collection();

    var stageViews = new Stage.ContainerView({
      el: $('#stage-container'),
      model: stages
    });

    var stagePicker = new Stage.PickerView({
      el: $('.stage-picker')
    });
    stagePicker.on('select', function (modelKey) {
      var selectedStage = Stage.PredefinedModelFactory(modelKey);
      stages.append(selectedStage);
    });
    stagePicker.render();

    var defaultStage = Stage.PredefinedModelFactory('warmup');
    defaultStage.set("index", 0);
    stages.add(defaultStage);
  });
})(this);
