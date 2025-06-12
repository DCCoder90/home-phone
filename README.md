# Home Phone System

This project is a backup and implementation of a home phone system utilizing Twilio services, a SIP-enabled phone (GrandStream DP750), and custom call handling logic.  This project is a result of needing more advanced call handling logic on our home phone system to ensure the safety of our kids, while not needing a system as comprehensive as asterisk.  I also just like the flexibility of being able to make any adjustments I want without having to dive too deep into the system.

## Overview

The system manages both incoming and outgoing calls for a home phone line. Key features include:
-   **Incoming Call Routing**: Directs calls to a SIP device.
-   **Caller Whitelisting**: Allows calls only from pre-approved numbers for general incoming calls.
-   **Owner Bypass & Options**: Provides special options if the owner calls in (e.g., connect directly, monitor ongoing calls).
-   **Outbound Calling via SIP**: Enables making outbound calls from the SIP phone through Twilio, with destination number whitelisting.
-   **Call Monitoring**: Allows the owner to silently listen to ongoing conference calls.
-   **Conference Bridging**: Uses Twilio Conferences to connect various call legs.

## Technologies Used

-   **Twilio**:
    -   Twilio Studio: For visual call flow design (`conf.json`, `conf-out.json`).
    -   Twilio Functions: Serverless functions for custom logic (JavaScript).
    -   Twilio TwiML: XML-based instructions for call control.
    -   Twilio Programmable Voice: SIP Trunking/Connectivity.
-   **GrandStream DP750**: The SIP-enabled DECT base station and handsets used as the home phone.

## Components

### 1. Twilio Studio Flows

Located in the `/home/mallette/home-phone/studio/` directory.

-   **`conf.json` (Incoming Call Handler)**:
    -   Manages all incoming calls to the main Twilio phone number.
    -   Checks if the caller is the owner.
        -   If owner: Checks for an active conference. Offers options to connect to the SIP phone or monitor the existing conference.
    -   If not owner: Checks the caller's number against `whitelistnumbers.json`.
        -   If whitelisted: Connects the call to the SIP phone via a conference.
        -   If not whitelisted: Plays a message and ends the call.

-   **`conf-out.json` (Outbound Call Handler / TwiML Bin Target)**:
    -   This flow is likely triggered when the GrandStream SIP phone makes an outbound call routed through Twilio, or when a Twilio Function creates a call leg that needs TwiML instructions (e.g., via `TWIML_BIN_URL`).
    -   Extracts the intended destination number (presumably from SIP URI dialed by Grandstream).
    -   Checks if the *destination number* is whitelisted.
    -   If destination is whitelisted: Initiates an outbound call to the destination and bridges it with the SIP phone via a conference.
    -   If destination is not whitelisted: Redirects the call from the SIP phone to owner's personal line.

### 2. Twilio Functions

Located in `/home/mallette/home-phone/services/HomePhone/`. These are Node.js functions deployed to Twilio Serverless.

-   **`conference-exists.js`**: Checks if a conference named "myconf" is currently active.
-   **`connect-monitor-to-conf.js`**: Generates TwiML to connect a caller to "myconf" in muted (listen-only) mode.
-   **`connect-to-outbound-call.js`**:
    -   Used by the outbound call flow (`conf-out.json`).
    -   Creates an API call to the final destination using `TWILIO_CALLER_ID`. This call leg is instructed to join "myconf" (via `TWIML_BIN_URL`).
    -   Returns TwiML to connect the initiating SIP phone to "myconf", effectively bridging the SIP phone and the destination.
-   **`connect-to-sip-endpoint.js`**:
    -   Used by the incoming call flow (`conf.json`).
    -   Creates an API call to the `SIP_ENDPOINT_URI` (your GrandStream phone). This call leg is instructed to join "myconf" (via `TWIML_BIN_URL`).
    -   Returns TwiML to connect the original incoming caller to "myconf", bridging them with the SIP phone.
-   **`getnumberfromsip.js`**: Parses a dialed phone number from a SIP URI string. Expects a format like `sip:NUMBER@m...`.
-   **`is-whitelisted.js`**: Checks if an incoming phone number (or a destination number in the outbound flow) exists in the `whitelistnumbers.json` asset.

### 3. TwiML Bins

-   **`Conference Dial.xml`**:
    ```xml
    <Response>
        <Dial>
            <Conference record="true" endConferenceOnExit="true">myconf</Conference>
        </Dial>
    </Response>
    ```
    This is an example TwiML Bin. The actual TwiML Bin used by the functions is specified by the `TWIML_BIN_URL` environment variable. It likely contains similar TwiML to join "myconf", or could be TwiML to directly dial the SIP endpoint.

### 4. Configuration Files

-   **`services/HomePhone/services.env`**:
    -   Contains environment variables for Twilio Functions.
    -   `SIP_ENDPOINT_URI`: Your GrandStream phone's SIP URI (e.g., `sip:user@yourdomain.com:port`).
    -   `TWILIO_CALLER_ID`: The phone number to use as caller ID for outbound calls made by the system.
    -   `TWIML_BIN_URL`: URL of a TwiML Bin that new call legs (created via API) should execute (e.g., to join "myconf").

-   **`services/HomePhone/whitelistnumbers.json`**:
    -   A JSON array of objects, each specifying a whitelisted phone number and associated person.
    -   Used by `is-whitelisted.js` to authorize incoming calls and outbound destinations.
    -   Example:
        ```json
        [
            {
                "Number":"+15555555555",
                "OverrideBedtime":true,
                "PrimaryContact": null,
                "Person":"John Doe"
            }
        ]
        ```

## Setup and Configuration

1.  **Twilio Account**: Ensure you have a Twilio account with a phone number.
2.  **GrandStream DP750**:
    -   Configure a SIP account on the GrandStream to register with Twilio (if using Twilio SIP Trunking for PSTN termination) or your SIP provider.
    -   Ensure it can receive calls at the `SIP_ENDPOINT_URI`.
    -   For outbound calling via Twilio: Configure the GrandStream to route specific dialed numbers (or all outbound calls) to a Twilio SIP Domain associated with your `conf-out.json` Studio Flow. The dialed number needs to be passed in a way that `getnumberfromsip.js` can parse it (e.g., Grandstream dials `sip:TARGET_NUMBER@your-twilio-sip-domain.sip.twilio.com`).
3.  **Twilio Functions**:
    -   Deploy all JavaScript files from `services/HomePhone/` as Twilio Functions within a Service.
    -   Set the environment variables from `services.env` in your Twilio Functions Service configuration.
        -   `SIP_ENDPOINT_URI`: Your actual SIP endpoint.
        -   `TWILIO_CALLER_ID`: Your actual Twilio number for caller ID.
        -   `TWIML_BIN_URL`: Create a TwiML Bin (e.g., using the content of `Conference Dial.xml` or similar) and put its URL here.
4.  **Twilio Assets**:
    -   Upload `whitelistnumbers.json` as a Private Asset in your Twilio Functions Service. Note its path for use in `is-whitelisted.js` (default is `/whitelistnumbers`).
5.  **Twilio Studio Flows**:
    -   Import `conf.json` and `conf-out.json` into Twilio Studio.
    -   Update all "Run Function" widgets in both flows to point to the correct deployed Twilio Functions URLs.
    -   In `conf.json`:
        -   Update the `split_1` widget: change `+MY_PHONE_NUMBER` to your actual personal phone number.
        -   Update the `split_2` widget: change `SUPER_SECRET_CODE` to your desired monitoring access code.
    -   In `conf-out.json`:
        -   Update the `connect_call_1` widget: change `+1MY_PHONE_NUMBER` to your actual personal phone number for fallback.
    -   Connect your main Twilio phone number's "A CALL COMES IN" event to the `conf.json` Studio Flow.
    -   If using SIP for outbound from Grandstream, connect your Twilio SIP Domain's "A CALL COMES IN" event to the `conf-out.json` Studio Flow.

## Call Flow Descriptions

### Incoming Calls (handled by `conf.json`)

1.  Call arrives at your Twilio number.
2.  Flow checks if caller is owner.
    -   **Owner Calling**:
        -   Checks if "myconf" conference is active.
        -   If active: Prompts owner to press 1 (connect) or 8 (monitor).
            -   Press 1: `connect-to-sip-endpoint` bridges owner to SIP phone via "myconf".
            -   Press 8: Prompts for `SUPER_SECRET_CODE`. If correct, `connect-monitor-to-conf` adds owner as muted participant.
        -   If not active: `connect-to-sip-endpoint` bridges owner to SIP phone via "myconf".
    -   **Other Caller**:
        -   `is-whitelisted` checks `event.From` against `whitelistnumbers.json`.
        -   If whitelisted: `connect-to-sip-endpoint` bridges caller to SIP phone via "myconf".
        -   If not whitelisted: Plays a rejection message and hangs up.

### Outbound Calls from SIP Phone (handled by `conf-out.json`)

1.  GrandStream phone dials out, routing the call to a Twilio SIP interface linked to `conf-out.json`. The dialed number is expected to be part of the SIP URI (e.g., `sip:TARGET_NUMBER@your-twilio-sip-domain.sip.twilio.com`).
2.  `getnumberfromsip` extracts `TARGET_NUMBER` from `trigger.call.To`.
3.  `is-whitelisted` checks if `TARGET_NUMBER` is in `whitelistnumbers.json` (acting as an allowed destination list).
    -   **Destination Whitelisted**:
        -   `connect-to-outbound-call` is executed.
        -   This function makes an API call from `TWILIO_CALLER_ID` to `TARGET_NUMBER`. This new call leg is directed by `TWIML_BIN_URL` (likely to join "myconf").
        -   The original call from the SIP phone is also directed to join "myconf".
        -   Result: SIP phone is bridged to `TARGET_NUMBER` via "myconf".
    -   **Destination Not Whitelisted**:
        -   The call from the SIP phone is directly connected to `+1MY_PHONE_NUMBER` (owner's personal line).

### Call Monitoring

If an owner calls in while a conference ("myconf") is active, they can choose to enter a `SUPER_SECRET_CODE` to be connected to the conference as a muted participant, allowing them to listen silently.