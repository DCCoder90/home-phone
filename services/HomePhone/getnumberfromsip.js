exports.handler = (context, event, callback) => {
    console.log(event.Number);
    let number = event.Number.split("p:");
    let finalNumber = number[1].split("@m");
  
    var results = {"number": finalNumber[0]};
  
    console.log(results);
  
    return callback(null,results);
  };