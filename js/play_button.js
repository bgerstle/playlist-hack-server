(function() {

var supportedParametersHash = {
    theme: {black: "black", white: "white"},
    view: {list: "list", coverArt: "coverart"}
};

this.PlayButtonModel = Backbone.Model.extend({
    defaults: {
        title: "Playlist",
        theme: supportedParametersHash.theme.black,
        view: supportedParametersHash.view.list
    },

    supportedParameters: supportedParametersHash,

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

    validate: function(attrs, options) {
        var paramValidationError = this.validateSupportedParameters(attrs,options);
        if (paramValidationError) {
            return paramValidationError;
        }
    },

    validateSupportedParameters: function(attrs, options) {
        if (!attrs) {
            return null;
        }

        return _.reduce(this.supportedParameters, function (error, validValues, param) {
            // bail if there's already been a validation error
            if (error) return;

            if (_.has(attrs, param) && !_.has(validValues, attrs[param])) {
                error = "Unexpected value: " + attrs[param] + " for play button parameter " + param +
                        ". Supported values: " + JSON.stringify(validValues);
            }
        }, null);
    },

    commaSeparatedTracks: function() {
        if (this.has("tracks") && this.get("tracks").length > 0) {
            return this.get("tracks").join(',');
        }
        return "";
    },

    getSrc: function() {
        this.validate();
        if (this.validationError) {
            throw this.validationError;
        }

        var uri = ["https://embed.spotify.com/?uri=spotify:trackset",
                  this.escape("title") || "",
                  this.commaSeparatedTracks()].join(':');
        var query = "?view=" + this.get("view") + "&theme=" + this.get("theme");
        return uri + query;
    }
});

this.PlayButtonView= Backbone.View.extend({
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