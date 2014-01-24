$(function () {

var playbuttonModel = new PlayButtonModel();
var playbuttonView = new PlayButtonView({
    el: $('#playlist'),
    model: playbuttonModel,
});

playbuttonModel.set({
    title: "Cycling",
    tracks: [
        '1HRtVWNhS9tEvDQyOKD9Fs', /* MJ Don't Stop */
        '0mckKOsMlBypUfD6gzdNhY', /* MJ Rock With You */
        '4DIWRIrMWDFdtSIeEo1gou' /* JT & JZ Suit & Tie */
    ]
});

});