exports.handler = async function(context, event, callback) {
    // Get the Twilio REST API client.
    const client = context.getTwilioClient();
    const conferenceName = 'myconf';

    console.log(`Checking for an active conference named: ${conferenceName}`);

    try {
        // Fetch a list of conferences, filtering by name and status.
        // We only need to find one to confirm it exists, so we limit the result to 1.
        const conferences = await client.conferences.list({
            friendlyName: conferenceName,
            status: 'in-progress',
            limit: 1
        });

        // If the list has one or more items, the conference exists.
        if (conferences.length > 0) {
            console.log(`Found active conference: ${conferences[0].sid}`);
            // Return true if an active conference is found.
            return callback(null, true);
        } else {
            console.log('No active conference found with that name.');
            // Return false if no active conference is found.
            return callback(null, false);
        }
    } catch (error) {
        console.error(`Error when checking conference status: ${error}`);
        // In case of an API error, return the error.
        return callback(error);
    }
};
