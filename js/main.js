$().ready(function() {

// Nicole's Crap
$(document).delegate('.more-song-info', 'click', showSongSummary);
$(document).delegate('.search-form select', 'change', updateSelectUI);

// Update Hover on Select Y DOES IT HAVE TO BE THIS WAY JQUERY
/* var selectIsFocus = false; */
$('.search-type').mouseover(function (e) {
	$(e.target).addClass('hover');
}).mouseout(function (e) {
  $(e.target).removeClass('hover');
});

function showSongSummary(e) {
  if (!$(this).next('.song-summary-container').hasClass('selected')) {
    $(this).next('.song-summary-container').addClass('selected');
    $(this).html('-').css('padding', '0px 8px');
  } else {
    $(this).next('.song-summary-container').removeClass('selected');
    $(this).html('+').css('padding', '0px 7px');
  }
}

function updateSelectUI(e) {
  $('.search-type').removeClass('hover');

  var selectedText = $('.search-form select').find(":selected").text();

  if (selectedText === 'Artist' || selectedText === 'Genre') {
    $('.search-type').addClass('moveArrowDown');
  } else {
    $('.search-type').removeClass('moveArrowDown');
  }

}

$('.search-results').css('height', $(window).height() - 300);

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
