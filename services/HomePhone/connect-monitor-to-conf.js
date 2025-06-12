exports.handler = function(context, event, callback) {
    const twiml = new Twilio.twiml.VoiceResponse();
    const conferenceName = 'myconf';

    console.log(`Incoming listen-in request from: ${event.From}`);
    console.log(`Connecting caller to conference '${conferenceName}'`);


    const dial = twiml.dial();

    dial.conference({
        muted: true,
        beep: false,
    }, conferenceName);

    return callback(null, twiml);
};