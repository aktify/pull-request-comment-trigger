#!/usr/bin/env node

const core = require("@actions/core");
const { context, GitHub } = require("@actions/github");

async function run() {
    const trigger = core.getInput("trigger", { required: true });

    const reaction = core.getInput("reaction");
    const { GITHUB_TOKEN } = process.env;
    if (reaction && !GITHUB_TOKEN) {
        core.setFailed('If "reaction" is supplied, GITHUB_TOKEN is required');
        return;
    }

    if (
        context.eventName === "issue_comment" &&
        !context.payload.issue.pull_request
    ) {
        // not a pull-request comment, aborting
        console.log("Not a PR or issue comment, aborting");
        core.setOutput("triggered", "false");
        return;
    }

    console.log(JSON.stringify(context.payload.pull_request));
    const body =
        (context.eventName === "issue_comment"
            ? context.payload.comment.body
            : context.payload.pull_request.body || context.payload.pull_request.pull_request.body) || '';
    
    core.setOutput('comment_body', body);

    const { owner, repo } = context.repo;

    const prefixOnly = core.getInput("prefix_only") === 'true';
    const triggered = (prefixOnly && body.startsWith(trigger)) || (!prefixOnly && body.includes(trigger));
    console.log(`body=${body}`);
    console.log(`trigger=${trigger}`);
    console.log(`body.includes(trigger)=${body.includes(trigger)}`);
    core.setOutput("triggered", triggered);

    if (triggered && reaction) {
        const client = new GitHub(GITHUB_TOKEN);
        if (context.eventName === "issue_comment") {
            await client.reactions.createForIssueComment({
                owner,
                repo,
                comment_id: context.payload.comment.id,
                content: reaction
            });
        } else {
            await client.reactions.createForIssue({
                owner,
                repo,
                issue_number: context.payload.pull_request.number,
                content: reaction
            });
        }
    }
}

run().catch(err => {
    console.error(err);
    core.setFailed("Unexpected error");
});
