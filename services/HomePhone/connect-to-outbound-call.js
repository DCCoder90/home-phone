exports.handler = async function(context, event, callback) {
    const client = context.getTwilioClient();
    const twiml = new Twilio.twiml.VoiceResponse();

    console.log(`Incoming call from: ${event.from} to Twilio number: ${event.To}`);
    console.log(`Attempting to bridge to SIP endpoint: ${context.SIP_ENDPOINT_URI}`);

    if (!context.SIP_ENDPOINT_URI || !context.TWIML_BIN_URL) {
        console.error("CRITICAL ERROR: One or more required environment variables (SIP_ENDPOINT_URI, TWIML_BIN_URL) are not set.");
        twiml.say('We are sorry, but there is a system configuration error. Please contact an administrator.');
        return callback(null, twiml);
    }

    if (!event.from) {
        console.error("CRITICAL ERROR: The 'event.from' field is missing. Cannot determine 'from' number for outbound call.");
        twiml.say('We are sorry, a system error occurred. The calling number could not be identified.');
        return callback(null, twiml);
    }

    try {
        await client.calls.create({
            url: context.TWIML_BIN_URL,
            to: event.To,
            from: `${context.TWILIO_CALLER_ID}`
        });
        console.log(`Successfully initiated call to SIP endpoint: ${context.SIP_ENDPOINT_URI}`);
    } catch (error) {
        console.error(`Error initiating call to SIP endpoint: ${error}`);

        // If we can't dial the SIP endpoint, inform the original caller and hang up.
        twiml.say('We are sorry, but we could not connect to the recipient. Please try again later.');
        return callback(null, twiml);
    }

    twiml.say('This call is being monitored or recorded.');
    const dial = twiml.dial();
    
    dial.conference({
        endConferenceOnExit: true,
        record: "record-from-start"
    }, "myconf");

    console.log('Responding to original caller with TwiML to join conference.');
    return callback(null, twiml);
};
