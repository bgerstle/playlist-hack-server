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

    // initialize app w/ default stage
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

    ///
    /// Setup Right Panel (TODO: put in a separate view class?)
    ///

    ///
    /// Playlist "Button"
    ///

    var getSelectedTracks = function () {
      var newTracks = [];
      if (stages.length) {
        newTracks = _.map(stages.getSelectedSongs(), function (song) {
          return song.getSpotifyTrackID();
        });
      }
      return newTracks;
    };

    var updatePlaylistButtonTracks = function () {
      var selectedTracks = getSelectedTracks();
      if (selectedTracks.length === 0 && playlistButtonModel.get("tracks").length === 0) {
        return;
      }
      var $sidebarLoadingIndicator = $('#rightSidebar > .loadingIndicator');
      var fadeInDuration = 450;
      $sidebarLoadingIndicator.fadeIn(fadeInDuration);
          // after fading in...
          _.delay(function () {
            playlistButtonModel.set("tracks", selectedTracks);
            // wait a bit after setting tracks, then fade out
            _.delay(function () {
              $sidebarLoadingIndicator.fadeOut(500);
            }, 450);
          }, fadeInDuration);
    };

    stages.on('playlist:sort playlist:change:selected',
              updatePlaylistButtonTracks);

    ///
    /// Workout Stats
    ///

    var WorkoutStatsModel = Backbone.Model.extend({});
    var WorkoutStatsView = Backbone.View.extend({
      initialize: function (options) {
        this.model.on('change', this.render, this);
      },
      template: function () {
        if (_.keys(this.model.attributes).length === 0) {
          return '';
        }
        return _.template($('#workout-stats-template').html(), {
          sections: this.model.toJSON()
        });
      },
      render: function () {
        this.$el.html(this.template());
      }
    });

    var statsModel = new WorkoutStatsModel();
    var statsView = new WorkoutStatsView({
      el: $('#workoutStats'),
      model: statsModel
    });

    /*
     !!!: need to use a factory to make sure we get a new object, using
     _.clone() only makes a shallow copy
     */
    // TODO: DRY this up and make a class
    var StatTemplate = function (options) {
      _.extend(this, {
        duration: {
          title: "Duration",
          value: 0
        },
        averageEnergy: {
          title: "Average Energy",
          value: 0
        },
        averageDanceability: {
          title: "Average Danceability",
          value: 0
        },
        averageTempo: {
          title: "Average Tempo",
          value: 0
        }
      }, options);
    };

    var maybePadZero = function (time) {
      if (time.length < 2) {
        time = '0' + time;
      }
    };
    var quickSecondsToTime = function (seconds) {
      var fmtMinutes = maybePadZero(String(Math.floor(seconds / 60)));
      var fmtSeconds = maybePadZero(String(Math.floor(seconds % 60)));

      return [fmtMinutes, ':', fmtSeconds].join('');
    };

    var percentify = function (normalized) {
      return String(Math.floor(normalized * 100));
    };

    var StatFormatters = {
      duration: quickSecondsToTime,
      averageEnergy: percentify,
      averageDanceability: percentify,
      averageTempo: function (tempo) { return Math.floor(tempo); }
    };

    var updateWorkoutStats = function () {
      statsModel.clear();

      var overallStats = new StatTemplate(),
          stageSelectedSongs = [];

      stages.each(function (stage) {
        var stageStats = new StatTemplate();
        stageSelectedSongs = _.pluck(stage.getSelectedSongs(), "attributes");
        if (stageSelectedSongs.length === 0) {
          return;
        }

        // reset (instead of recloning)
        _.each(stageSelectedSongs, function (selectedSong) {
          stageStats.duration.value = 0;
          stageStats.averageEnergy.value = 0;
          stageStats.averageTempo.value = 0;
          stageStats.averageDanceability.value = 0;
        });

        // sum
        _.each(stageSelectedSongs, function (selectedSong) {
          stageStats.duration.value += selectedSong.audio_summary.duration;
          stageStats.averageEnergy.value += selectedSong.audio_summary.energy;
          stageStats.averageTempo.value += selectedSong.audio_summary.tempo;
          stageStats.averageDanceability.value += selectedSong.audio_summary.danceability;
        });

        // get key for the stat object (i.e. "Warm Up" or "Warm Up 1")
        var stageStatsHeader = stage.get("title"),
        keyIterations = 1;
        while (statsModel.has(stageStatsHeader)) {
          stageStatsHeader = [stage.get("title"), String(keyIterations)].join(' ');
          keyIterations++;
        }

        // average
        _.each(stageStats, function (stat, key, stats) {
          if (key !== 'duration') {
            stat.value /= stageSelectedSongs.length;
          }
        });

        // set stats object in statsModel
        statsModel.set(stageStatsHeader.replace(/ /, "_"), {
          title: stageStatsHeader,
          data: stageStats
        }, {silent: true});

        // sum overall stats
        overallStats.duration.value += stageStats.duration.value;
        overallStats.averageEnergy.value += stageStats.averageEnergy.value;
        overallStats.averageTempo.value += stageStats.averageTempo.value;
        overallStats.averageDanceability.value += stageStats.averageDanceability.value;
      });

      if (!statsModel.hasChanged()) {
        return;
      }

      // average overall stats
      _.each(overallStats, function (stat, key, stats) {
          if (key !== 'duration') {
            stat.value /= stages.length;
          }
      });

      // set overall stats
      statsModel.set("overall", {
        title: "Overall",
        data: overallStats
      }, {silent: true});

      // format all stats, then fire change event
      _.each(statsModel.attributes, function (stat, key) {
        _.each(stat.data, function (statData, dataKey) {
          statData.value = StatFormatters[dataKey](statData.value);
        });
      });

      statsModel.trigger('change');
    };

    stages.on('playlist:sort playlist:change:selected',
              updateWorkoutStats);
  });
})(this);
