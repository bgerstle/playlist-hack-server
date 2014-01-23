(function() {
this.PlaylistModel = Backbone.Model.extend({
    defaults: {
        title: "Playlist"
    },

    initialize: function(options) {
        if (options) {
            if (typeof options.tracks === Array) {
                this.set("tracks", options.tracks.slice());
            }

            if (typeof options.title === String) {
                this.set("title", options.title.slice());
            }
        }
    },

    commaSeparatedTracks: function() {
        if (this.has("tracks") && this.get("tracks").length > 0) {
            return this.get("tracks").join(',');
        }
        return "";
    },

    getSrc: function() {

        return ["https://embed.spotify.com/?uri=spotify:trackset",
               this.escape("title") || "",
               this.commaSeparatedTracks()].join(':');
    }
});

this.PlaylistView= Backbone.View.extend({
    initialize: function(options) {
        this.model.on("change", this.render, this);
    },
    hide: function() {
        this.$el.hide();
    },
    show: function() {
        this.$el.show();
    },
    render: function() {
        this.$el.attr("src", this.model.getSrc());
    }
});
})(this);