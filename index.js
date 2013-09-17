var url_parser = require("url")

var createUrlParamsExtractor = function(url){
  url = url_parser.parse(url).path
  return {
    exec: function(urlpath){
      var result = {}
      var tokens = url.split("/")
      var urlparts = urlpath.split("/")
      if(tokens.length != urlparts.length) return false
      for(var i = tokens.length-1; i>=0; i--) {
        if(tokens[i].length == 0) continue;
        var value = urlparts.pop() // take them from last to first
        if(tokens[i].indexOf(":") !== -1) {
          result[tokens[i].replace(":","")] = value
        }
      }
      return result
    }
  }
}

/*
  supports input in form: 
  Object({
    "GET /url": Reaction,
    "POST /url": Reaction,
    "PUT /url": Reaction,
    "DELETE /url": Reaction
  })
*/
var fromActions = module.exports.fromActions = function(base_url, actions) {
  if(!actions) {
    actions = base_url
    base_url = null
  }
  var methods = { GET: {}, POST: {}, PUT: {}, DELETE: {} };
  for(var actionName in actions) {
    var parts = actionName.split(" ")
    var methodName = parts.shift()
    var actionUrl = parts.shift()
    var action = actions[actionName]
    action.url = actionUrl
    if(action.url && action.url.indexOf(":") !== -1)
      action.url = createUrlParamsExtractor(action.url)
    methods[methodName][actionUrl] = action
  }
  return function(c, next) {
    var reactions = methods[c.req.method];
    var request_url = c.req.url;
    if(base_url)
      request_url = request_url.replace(base_url, "")
    next.reaction = function(name){
      var url_params;
      if(reactions[name].url && reactions[name].url.exec)
        url_params = reactions[name].url.exec(request_url)
      if(url_params)
        c.req.params = url_params
      if(reactions[name].length == 2)
        reactions[name](c, next)
      if(reactions[name].length == 3)
        reactions[name](c.req, c.res, next)
    }

    for(var url in reactions) {
      var reaction = reactions[url]
      var url_params;
      if(!reaction.url ||
        request_url.indexOf(reaction.url) !== -1 || 
        (reaction.url.exec && ( url_params = reaction.url.exec(request_url) ))){

        if(reaction.url && reaction.url.exec && url_params)
          c.req.params = url_params

        if(reaction.length == 2)
          return reaction(c, next)
        if(reaction.length == 3)
          return reaction(c.req, c.res, next)
      }
    }
    next()
  }
}