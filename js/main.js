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

// Nicole's Crap
$(document).delegate('.more-song-info', 'click', showSongSummary);
$(document).delegate('.search-container select', 'change', updateSelectUI);

// Update Hover on Select Y DOES IT HAVE TO BE THIS WAY JQUERY
/* var selectIsFocus = false; */
$('.searchType').mouseover(function(e) {
	$(e.target).addClass('hover');
}).mouseout(function(e) {
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
  $('.searchType').removeClass('hover');

  var selectedText = $('.search-container select').find(":selected").text();

  if (selectedText === 'Artist' || selectedText === 'Genre') {
    $('.searchType').addClass('moveArrowDown');
  } else {
    $('.searchType').removeClass('moveArrowDown');
  }

}

$('.searchResults').css('height', $(window).height() - 300);

///////////////////////////////
// Put all the pieces together
///////////////////////////////

var defaultPlaylist = new EchoNest.StaticPlaylist([],{
  comparator: function (a, b) {
        // sort by song energy, descending
        return b.get("audio_summary").energy - a.get("audio_summary").energy;
      }
    });
var defaultSearchView = new Search.SearchFormView({
  el: $('#warmup .search-container'),
  model: defaultPlaylist
});

defaultSearchView.addField();
defaultSearchView.$(".searchType > [value='artist-radio']").prop("selected", true);
defaultSearchView.resultSubviews[0].$el.attr("value", "The Black Keys");
defaultSearchView.search();

var searchResultsView = new Search.SearchResultListView({
  el: $('#warmup .searchResults'),
  model: defaultPlaylist,
  searchView: defaultSearchView
});
searchResultsView.render();

var $loadingIndicator = $('.loadingIndicator');
$loadingIndicator.height(searchResultsView.$el.height());
$loadingIndicator.width(searchResultsView.$el.width());

var $loadingIndicator = $('.loadingIndicator');
defaultSearchView.on('search:started', $loadingIndicator.fadeIn, $loadingIndicator);
defaultSearchView.on('search:finished search:failed', $loadingIndicator.fadeOut, $loadingIndicator);

});
