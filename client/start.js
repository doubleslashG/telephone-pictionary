Template.start.events({
  'submit, click #done': function (evt, templ) {
    evt.stopPropagation();
    evt.preventDefault();
    // PHASE 5
    // use the template to find the '#phrase' input
    // if it has a value, submit that.
    var answer = template.find('#phrase').value;
    if(answer)
      submitAnswer(answer);
    // note: check the submitAnswer helper function in main.js
  }
});
