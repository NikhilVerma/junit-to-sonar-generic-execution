"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const xml2js_1 = __importDefault(require("xml2js"));
const glob_1 = __importDefault(require("glob"));
const yargs_1 = __importDefault(require("yargs"));
const argv = yargs_1.default
    .usage("Usage: npx junit-to-sonar-generic-execution [options]")
    .option("dir", {
    alias: "d",
    describe: "The directory containing JUnit XML result files",
    demandOption: true,
    type: "string",
})
    .option("output", {
    alias: "o",
    describe: "The output file name and path for the Sonar Generic execution format",
    demandOption: true,
    type: "string",
})
    .help()
    .alias("help", "h")
    .parseSync();
const xmlFiles = glob_1.default.sync(`${argv.dir}/**/*.xml`);
if (xmlFiles.length === 0) {
    console.error(`No JUnit XML result files found in ${argv.dir}`);
    process.exit(1);
}
const testExecutions = {
    testExecutions: {
        $: {
            version: "1",
        },
        file: [],
    },
};
xmlFiles.forEach((file) => {
    xml2js_1.default.parseString(fs_1.default.readFileSync(file, "utf-8"), (err, result) => {
        if (err) {
            console.error("XML Parsing error", err);
            return;
        }
        if (!result.testsuites) {
            console.error("No suites in XML");
            return;
        }
        const rootSuite = result.testsuites.testsuite.shift();
        if ((rootSuite === null || rootSuite === void 0 ? void 0 : rootSuite.$.name) !== "Root Suite") {
            console.error(`Root suite name is not "Root Suite" in ${file}`);
            return;
        }
        const testFile = {
            $: {
                path: rootSuite.$.file,
            },
            testCase: [],
        };
        result.testsuites.testsuite.forEach((suite) => {
            var _a;
            (_a = suite.testcase) === null || _a === void 0 ? void 0 : _a.forEach((testcase) => {
                const newTestCase = {
                    $: {
                        name: testcase.$.name,
                        duration: testcase.$.time,
                    },
                };
                if (testcase.failure) {
                    newTestCase.failure = {
                        $: {
                            message: testcase.failure[0].$.message,
                        },
                        _: testcase.failure[0]._,
                    };
                }
                testFile.testCase.push(newTestCase);
            });
        });
        testExecutions.testExecutions.file.push(testFile);
    });
});
const builder = new xml2js_1.default.Builder({
    cdata: true,
});
const xml = builder.buildObject(testExecutions);
fs_1.default.writeFileSync(argv.output, xml);
console.log(`Sonar Generic execution data written to ${argv.output}`);
//# sourceMappingURL=index.js.map