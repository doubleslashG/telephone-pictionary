var timerDep = new Deps.Dependency();

Template.timer.timeLeft = function () {
  // PHASE 6
  // Depend on the timer dependency so we rerun whenever it's changed.
  // Calculate the time in seconds left on the current assignment.
  var seconds = (Session.get("assignment").expires - new Date()) / 1000;
  // If the current assignment has expired, set the 'assignment' session
  // variable back to null.
  if(seconds < 0) {
    Session.set('assignment', null);
    seconds = 0;
  }
  
  timerDep.depend();
  
  // Return the time left.
  return seconds;
};

Meteor.setInterval(function () {
  // Tell the dependency that it has changed.
  timerDep.changed();
}, 500);
