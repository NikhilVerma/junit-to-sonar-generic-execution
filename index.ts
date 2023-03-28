import fs from "fs";
import xml2js from "xml2js";
import glob from "glob";
import yargs from "yargs";
import path from "path";

const argv = yargs
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

const xmlFiles = glob.sync(`${path.resolve(__dirname, argv.dir)}/**/*.xml`);

if (xmlFiles.length === 0) {
    console.error(`No JUnit XML result files found in ${argv.dir}`);
    process.exit(1);
}

const testExecutions: SonarGenericExecutionFormat = {
    testExecutions: {
        $: {
            version: "1",
        },
        file: [],
    },
};

xmlFiles.forEach((file) => {
    xml2js.parseString(fs.readFileSync(file, "utf-8"), (err, result: JUnitXMLFormat) => {
        if (err) {
            console.error("XML Parsing error", file, err);
            return;
        }

        if (!result.testsuites?.testsuite) {
            console.error("No suites in XML", file, result);
            return;
        }

        const rootSuite = result.testsuites.testsuite.shift();

        if (rootSuite?.$.name !== "Root Suite") {
            console.error(`Root suite name is not "Root Suite" in ${file}`);
            return;
        }

        const testFile: SonarGenericExecutionFormatFile = {
            $: {
                path: rootSuite.$.file,
            },
            testCase: [],
        };

        result.testsuites.testsuite.forEach((suite) => {
            suite.testcase?.forEach((testcase) => {
                const newTestCase: SonarGenericExecutionFormatFileTestCase = {
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

const builder = new xml2js.Builder({
    cdata: true,
});

const xml = builder.buildObject(testExecutions);

fs.writeFileSync(argv.output, xml);

console.log(`Sonar Generic execution data written to ${argv.output}`);

/**
 * Types
 */

type JUnitXMLFormat = {
    testsuites?: {
        $: {
            name: string;
            tests: string;
            failures: string;
            errors: string;
            time: string;
        };
        testsuite?: Array<{
            $: {
                name: string;
                tests: string;
                failures: string;
                errors: string;
                time: string;
                file: string;
                timestamp: string;
            };
            testcase?: [
                {
                    $: {
                        name: string;
                        classname: string;
                        time: string;
                    };
                    failure?: [
                        {
                            $: {
                                message: string;
                                type: string;
                            };
                            _?: string;
                        }
                    ];
                }
            ];
        }>;
    };
};

type SonarGenericExecutionFormat = {
    testExecutions: {
        $: {
            version: string;
        };
        file: Array<SonarGenericExecutionFormatFile>;
    };
};

type SonarGenericExecutionFormatFile = {
    $: {
        path: string;
    };
    testCase: Array<SonarGenericExecutionFormatFileTestCase>;
};

type SonarGenericExecutionFormatFileTestCase = {
    $: {
        name: string;
        duration: string;
    };
    failure?: {
        $: {
            message: string;
        };
        _?: string;
    };
};
