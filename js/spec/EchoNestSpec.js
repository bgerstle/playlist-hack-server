describe("Test fetching songs from EchoNest", function () {
    it("should fetch Billie Jean by Michael Jackson", function (done) {
        var songModel = new EchoNest.SongModel();
        songModel.deferredFetch({
            songParams: {
                title: "Billie Jean",
                artist: "Michael Jackson",
                results: 1
            }
        }).always(function (model, json, options) {
            expect(json.response.status.code).toBe(0);
            expect(model.get("id")).toBeTruthy();
            expect(model.get("id")).toEqual(songModel.get("id"));
            expect(model.get("title")).toBe("Billie Jean");
            expect(model.get("artist_name")).toBe("Michael Jackson");
            done();
        });
    });
});