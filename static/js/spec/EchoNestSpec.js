describe("Test fetching songs from EchoNest", function() {
  it("should fetch Billie Jean by Michael Jackson", function(done) {
    var songModel = new EchoNest.SearchSongModel();
    songModel.deferredFetch({
      songParams: {
        title: "Billie Jean",
        artist: "Michael Jackson",
        results: 1
      }
    }).always(function(collection, json, options) {
      var model = collection.at(0);
      expect(json.response.status.code).toBe(0);
      expect(model.get("id")).toBeTruthy();
      expect(model.get("title")).toBe("Billie Jean");
      expect(model.get("artist_name")).toBe("Michael Jackson");
      done();
    });
  });

  it("should fetch songs matching \"Billie Jean Michael Jackson\" using combined field", function(done) {
    var songModel = new EchoNest.SearchSongModel();
    songModel.deferredFetch({
      songParams: {
        combined: "Billie Jean Michael Jackson"
      }
    }).always(function(collection, json, options) {
      expect(json.response.status.code).toBe(0);
      var songModel = collection.findWhere({title: "Billie Jean", artist_name: "Michael Jackson"});
      expect(songModel.get("id")).toBeTruthy();
      done();
    });
  });

  it("should fetch artists matching \"Jamiroquai\" using artist name", function(done) {
    var search = new EchoNest.SearchArtistModel();
    search.deferredFetch({
      artistParams: {
        name: "Jamiroquai"
      }
    }).always(function(collection, json, options) {
      expect(json.response.status.code).toBe(0);
      var artistModel = collection.findWhere({name: "Jamiroquai"});
      expect(artistModel.get("id")).toBeTruthy();
      done();
    });
  });
});
