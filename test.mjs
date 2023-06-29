import prompt from 'async-prompt';
import * as re from './lib.mjs';

function help() {
    console.log(`Commands:
  help, ?
    print help

  exit, quit, bye, ^C
    exit

  play <stream>
    play the stream in roon -- must be one of the Roon-supported stream formats

  stop
    stop playback and release the zone back to Roon
`);
}

const _ev = "roon-connect-stream-example";

let pmpt = () => `[${_ev}] Enter command (? for help) > `;

const logger = (msg) => {
    if (msg)
        process.stdout.write("\n" + msg + "\n" + pmpt());
    process.stdout.write("\n" + pmpt());
}

re.init({ logger });

while (true) {
    const argv = await prompt(pmpt())?.split(/\s\s*/);

    if (argv[0] == "") {
        // do nothing

    } else if (argv[0] == "exit" || argv[0] == "quit" || argv[0] == "bye") {
        process.exit(0);

    } else if (argv[0] == "?" || argv[0] == "help") {
        help();

    } else if (argv[0] == "stop") {
        re.stop();

    } else if (argv[0] == "play") {
        const url = argv[1];
        if (!url)
            help();
        else
            re.play(url);

    } else {
        console.log(`error: unknown command: ${argv.join(" ")}`);
    }
}
