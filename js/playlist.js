(function () {
    var apiKey = 'TGPTMPVRMTCOBB9LV';
    var endpoint = 'http://developer.echonest.com/api/v4';
    var root = this;

    var queryStringFromParams = function(paramsHash) {
        var keys = _.keys(paramsHash);

        // for parameters that support multiple values, we need redundant key=value pairs in the query
        var pairs = _.reduce(paramsHash, function (pairs, value, key, paramsHash) {
            if (_.isArray(value)) {
                _.each(value, function (valueComponent) {
                    pairs.push([valueComponent, key]);
                });
            } else {
                pairs.push([value, key]);
            }
            return pairs;
        }, []);

        // format, encode, & stringify each key=value pair
        return _.reduce(pairs, function (queryString, kvPair, index, pairs) {
            if (index !== 0 && index < _.size(pairs)) {
                queryString = queryString + '&';
            }
            var value = encodeURI(String(kvPair[0]));
            var key = kvPair[1];
            return queryString.concat(key + '=' + value);
        }, '?');
    };

    var EchoNest = root.EchoNest = {};

    EchoNest.RosettaID = {
        Prefixes: {
            spotifyTrack: 'spotify-US:track:'
        },
        fromSpotifyTrackID: function(spotifyTrackID) {
            return this.Prefixes.spotifyTrack + spotifyTrackID;
        },
        toSpotifyTrackID: function(spotifyTrackFID) {
            return spotifyTrackFID.slice(this.Prefixes.spotifyTrack.length);
        }
    };
    _.each(_.functions(EchoNest.RosettaID), function (fn) {
        EchoNest.RosettaID[fn].bind(EchoNest.RosettaID);
    });

    EchoNest.SongModel = Backbone.Model.extend({
        getTrackFIDFromCatalog: function (catalog) {
            if (!this.has("tracks")) {
                return null;
            }
            var spotifyTrack = _.findWhere(this.get("tracks"), {catalog: catalog});
            if (spotifyTrack) {
                return spotifyTrack.foreign_id;
            }
            return null;
        },
        getSpotifyTrackFID: function () {
            return this.getTrackFIDFromCatalog('spotify-US');
        }
    });

    EchoNest.StaticPlaylist = Backbone.Collection.extend({
        model: EchoNest.SongModel,
        initialize: function (models, options) {
            var playlistParams = options ? options.playlistParams : {};
            this.playlistParams = _.defaults(playlistParams, {
                api_key: apiKey,
                // required for cross-domain requests
                format: 'jsonp',

                // return spotify tracks, acoustic metadata, and ranking by default
                bucket: ['id:spotify-US', 'tracks', 'audio_summary', 'song_hotttnesss'],

                // limit results to specified catl
                limit: true
            });
        },
        url: function () {
            return endpoint + '/playlist/static' + queryStringFromParams(this.playlistParams);
        },
        parse: function(json) {
            return json.response.songs;
        },
        deferredFetch: function (options) {
            var deferred = new $.Deferred();
            this.fetch({
                success: deferred.resolve.bind(deferred),
                error: deferred.reject.bind(deferred)
            });
            return deferred.promise();
        },
        fetch: function(options) {
            return Backbone.Collection.prototype.fetch.call(this, _.defaults(options || {}, {
                // required for cross-domain requests
                dataType: 'jsonp',
                callback: 'callback'
            }));
        },
        getSpotifyTrackIDs: function () {
            return _.reduce(this.models, function(memo, songModel) {
                var trackFID = songModel.getSpotifyTrackFID();
                if (trackFID) {
                    memo.push(EchoNest.RosettaID.toSpotifyTrackID(trackFID));
                }
                return memo;
            }, []);
        }
    });
})(this);