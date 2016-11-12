var path     = require("path"),
    protobuf = require(__dirname + "/../src/index"),
    JSONPoly = require("./lib/jsonpoly"),
    data     = require("./bench.json");

var times = process.argv.length > 2 ? parseInt(process.argv[2], 10) : 100000;

protobuf.load(require.resolve("./bench.proto"), function(err, root) {
    if (err)
        throw err;

    try {
        // Set up our test message and print the generated code
        var Test = root.lookup("Test");
        protobuf.util.codegen.verbose = true;
        Test.decode(Test.encode(data).finish());
        protobuf.util.codegen.verbose = false;

        console.log("\nThis benchmark measures message to buffer respectively buffer to message performance.");
        console.log("usage: " + path.basename(process.argv[1]) + " [iterations="+times+"] [protobufOnly]\n");
        console.log("encoding/decoding " + times + " iterations ...\n");
        
        function summarize(name, start, length) {
            var time = Date.now() - start;
            var sb = [ pad(name, 24, 1), " : ", pad(time + "ms", 10) ];
            if (length !== undefined)
                sb.push("   ", pad(length + " bytes", 15));
            console.log(sb.join(''));
        }

        function bench_protobuf() {
            var start = Date.now(),
                len = 0;
            for (var i = 0; i < times; ++i) {
                var buf = Test.encode(data).finish();
                len += buf.length;
            }
            summarize("encode protobuf." + "js", start, len);
            start = Date.now();
            len = 0;
            for (var i = 0; i < times; ++i) {
                var msg = Test.decode(buf);
                len += buf.length;
            }
            summarize("decode protobuf." + "js", start, len);
            console.log();
        }

        function bench_protobuf_rw() {
            var start = Date.now(),
                len = 0,
                buf;
            var writer = protobuf.Writer();
            for (var i = 0; i < times; ++i) {
                buf = Test.encode_(data, writer).finish();
                len += buf.length;
            }
            summarize("encode protobuf." + "js r/w", start, len);
            start = Date.now();
            len = 0;
            var reader = protobuf.Reader(buf);
            for (var i = 0; i < times; ++i) {
                var msg = Test.decode_(reader.reset(buf), new Test.ctor(), buf.length);
                len += buf.length;
            }
            summarize("decode protobuf." + "js r/w", start, len);
            console.log();
        }

        function bench_json(name, JSON) {
            var start = Date.now(),
                len = 0;
            for (var i = 0; i < times; ++i) {
                var buf = Buffer.from(JSON.stringify(data), "utf8");
                len += buf.length;
            }
            summarize("encode JSON " + name, start, len);
            start = Date.now();
            len = 0;
            for (var i = 0; i < times; ++i) {
                var msg = JSON.parse(buf.toString("utf8"));
                len += buf.length;
            }
            summarize("decode JSON " + name, start, len);
            console.log();
        }

        function bench_json_nb(name, JSON) {
            var start = Date.now(),
                str;
            for (var i = 0; i < times; ++i) {
                str = JSON.stringify(data);
            }
            summarize("encode JSON s/p " + name, start);
            start = Date.now();
            for (var i = 0; i < times; ++i) {
                JSON.parse(str);
            }
            summarize("decode JSON s/p " + name, start);
            console.log();
        }

        bench_protobuf();
        bench_protobuf_rw();
        if (process.argv.length < 4) {
            bench_json("native", JSON);
            bench_json_nb("native", JSON);
            // bench_json("polyfill", JSONPoly);
        }

        console.log("--- warmed up ---\n");
        bench_protobuf();
        bench_protobuf_rw();
        if (process.argv.length < 4) {
            bench_json("native", JSON);
            bench_json_nb("native", JSON);
            // bench_json("polyfill", JSONPoly);
        }

    } catch (e) {
        console.error(e);
    }        

});

function pad(str, len, l) {
    while (str.length < len)
        str = l ? str + " " : " " + str;
    return str;
}