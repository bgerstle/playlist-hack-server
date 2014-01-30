(function () {
  $().ready(function() {
    var defaultStage = new Stage.Model({
      index: 0,
      title: 'Warm Up',
      subtitle: 'Ease into your workout.'
    });

    var stages = new Stage.Collection();

    var stageViews = new Stage.ContainerView({
      el: $('#stage-container'),
      model: stages
    });

    stages.add(defaultStage);
  });
})(this);
