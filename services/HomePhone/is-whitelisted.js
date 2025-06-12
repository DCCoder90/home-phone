exports.handler = (context, event, callback) => {
    const incomingNumber = event.From;
  
    console.log("Call from ", incomingNumber);
  
    try {
      const openFile = Runtime.getAssets()['/whitelistnumbers'].open;
      const text = openFile();
      const whiteList = JSON.parse(text);
      const isWhitelisted = whiteList.length > 0 && whiteList.some(e => e.Number === incomingNumber);
      
      const response = {
          isWhitelisted: isWhitelisted
      };
  
      if (isWhitelisted) {
        console.log("White listed");
        return callback(null, response);
      } 
      
      console.log("Not white listed");
      return callback(null, response);
  
    } catch (error) {
      console.error("Error processing whitelist:", error);
      return callback(error);
    }
  };