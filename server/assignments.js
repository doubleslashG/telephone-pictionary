GAME_LENGTH = 3;

// Meteor.methods sets up RPCs you can access with Meteor.call('methodName', args...)
Meteor.methods({
  // Return an assignment for the current user.
  getAssignment: function () {
    if (!Meteor.userId())
      throw new Meteor.Error(403, "Must be logged in to play");

    // Use mongo to try and find a move we're already assigned.

    // PHASE 6
    // Modify this to require that the move hasn't expired.
    var move = Moves.findOne({
      assignee: Meteor.userId(),
      answer: null,
      expires: {$gt: new Date()}
    });
    // If there's no such move, create one
    // * Assigned to us
    // * Expiring in 100 seconds
    // * With an answer of null so far
    // * Create an _id for it explicitly (why?)
    if (!move) {
      move = {
        assignee: Meteor.userId(),
        expires: new Date(new Date().valueOf() + 100*1000),
        answer: null,
        _id: Random.id()
      };
      
      // PHASE 3

      // Use Mongo to find a game to tack this move on to.  The criteria are:
      // * The game is not done
      // * The game has no active move.
      // * We have not yet participated in this game (you can leave this
      //   one out for a while while you test).
      var game = Games.findOne({
        done: false,
        activeMove: null
      });
      
      // If we found a game, set up the `previous` field on the move with the
      // previous move in that game.
      // If we haven't found a game, set one up and insert it into the Games
      // collection. (hint: It's not done, its `activeMove` is null, has no
      // participants yet, and no moves yet)
      if(game)
        move.previous = game.moves[game.moves.length - 1];
      else {
        game = {
          moves: [],
          participants: [],
          activeMove: null,
          done: false
        };
        Games.insert(game);
      }
      
      // Either way, set the `game` field on the move to be the _id of the game
      // it belongs to.
      move.game = game._id;
      

      // Now we insert the move to the moves table.
      Moves.insert(move);

      // PHASE 3

      // Okay, now let's set the `activeMove` of our game to our new move, using
      // the update() method on the Games collection.
      Games.update(game._id,{$set: {activeMove: move._id}});
    }

    // Here, we do some work to make it easier for the client to make decisions
    // based on their assigned move -- we augment the move object with the
    // answer from the previous move.  Note that this doesn't affect what's in
    // the database.
    if (move.previous) {
      var prevMove = Moves.findOne(move.previous);
      if (!prevMove)
        throw new Error("missing the previous move");
      if (typeof prevMove.answer === "string") {
        move.description = prevMove.answer;
      } else {
        move.picture = prevMove.answer;
      }
    } else {
      move.start = true;
    }
    return move;
  },
  // Answer a particular assigned move with the given answer
  submitAnswer: function (assignmentId, answer) {
    if (!Meteor.userId())
      throw new Meteor.Error(403, "Must be logged in to play");
    // This makes sure the assignmentId the client passed us is actually a
    // string.  Prevents mongo injection attacks.
    check(assignmentId, String);
    // Do more answer validation.
    var assignment = Moves.findOne(assignmentId);
    if (assignment.expires.valueOf() < new Date().valueOf())
      throw new Meteor.Error(403, "Assignment has expired");
    var previous = Moves.findOne(assignment.previous);
    if (previous && typeof previous.answer === 'string')
      check(answer, Object);
    else
      check(answer, String);
    Moves.update(assignmentId, {$set: {answer: answer}});
    // Find the relevant game
    var game = Games.findOne(assignment.game);
    // Set the game to have no activeMove, and to be done if it has enough moves.
    var gameSetter = {activeMove: null};
    if (game.moves.length >= GAME_LENGTH - 1)
      gameSetter.done = true;
    // Also add this user to the participants, and this move to the list of moves.
    Games.update(game._id, {
      $set: gameSetter,
      $addToSet: {
        participants: Meteor.userId()
      },
      $push: {
        moves: assignmentId
      }
    });
  }
});

Meteor.setInterval(function () {
  // PHASE 6

  // Find all the moves that are expired but not answered.
  var oldMoves = Moves.find({
    expires: {$lt: new Date()},
    answer: null
  });
  
  oldMoves.forEach(function (move) {
    // Delete them from the Moves table.
    Moves.remove(move._id);
    
    // Find the relevant game, and unset them as the activeMove
    // If the game is otherwise empty, just remove it from the Games table.
    var game = Games.findOne({
      activeMove: move._id
    });
    Games.update(game._id, {$set: {activeMove: null}});
    
  });
}, 10*1000);
