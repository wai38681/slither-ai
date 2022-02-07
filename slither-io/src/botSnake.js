/**
 * Bot extension of the core snake
 * @param  {Phaser.Game} game      game object
 * @param  {String} spriteKey Phaser sprite key
 * @param  {Number} x         coordinate
 * @param  {Number} y         coordinate
 */
 const modelFitConfig = {              // Exactly the same idea here by using tfjs's model's
    epochs: 1,                        // fit config.
    stepsPerEpoch: 16
};

const numActions = 3;                 // Left or right or no rotation
const inputSize = 2;                // The coordiante of the bot
const temporalWindow = 1;

const totalInputSize = inputSize * temporalWindow + numActions * temporalWindow + inputSize;

const network = new ReImprove.NeuralNetwork();
network.InputShape = [totalInputSize];
network.addNeuralNetworkLayers([
    {type: 'dense', units: 32, activation: 'relu'},
    {type: 'dense', units: numActions, activation: 'softmax'}
]);

const model = new ReImprove.Model.FromNetwork(network, modelFitConfig);

// const model = tf.sequential();
// model.add(tf.layers.dense({units: 256, inputShape: [8]})); //input is a 1x8
// model.add(tf.layers.dense({units: 512, inputShape: [256]}));
// model.add(tf.layers.dense({units: 256, inputShape: [512]}));
// model.add(tf.layers.dense({units: 3, inputShape: [256]})); //returns a 1x3

// const learningRate = 0.001;
// const optimizer = tf.train.adam(learningRate);

model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

const teacherConfig = {
    lessonsQuantity: 10000,
    lessonLength: 20,                
    lessonsWithRandom: 2,
    epsilon: 0.5,
    epsilonDecay: 0.995,                
    epsilonMin: 0.05,
    gamma: 0.9                     
  };

const agentConfig = {
    model: model,
    agentConfig: {
        memorySize: 1000,                      // The size of the agent's memory (Q-Learning)
        batchSize: 128,                        // How many tensors will be given to the network when fit
        temporalWindow: temporalWindow         // The temporal window giving previous inputs & actions
    }
};

const academy = new ReImprove.Academy();
const teacher = academy.addTeacher(teacherConfig);
const agent = academy.addAgent(agentConfig);

academy.assignTeacherToAgent(agent, teacher);

BotSnake = function(game, spriteKey, x, y) {
    Snake.call(this, game, spriteKey, x, y);
    this.trend = 1;
}

BotSnake.prototype = Object.create(Snake.prototype);
BotSnake.prototype.constructor = BotSnake;

/**
 * Add functionality to the original snake update method so that this bot snake
 * can turn randomly
 */
BotSnake.prototype.tempUpdate = BotSnake.prototype.update;
BotSnake.prototype.update = async function() {

    let scale_before = this.scale;
    let inputs = [this.head.body.x, this.head.body.y];

    let result = await academy.step([{teacherName: teacher, agentsInput: inputs}])

    if(result != undefined){

        var action = result.get(agent);
        if(action === 0)
            this.trend = -1;
        else
            this.trend = 1
    }

    // console.log("scale_before: ", this.scale);
    // this.head.body.setZeroRotation();

    //ensure that the bot keeps rotating in one direction for a
    //substantial amount of time before switching directions
    // if (Util.randomInt(1,20) == 1) {
    //     this.trend *= -1;
    // }
    this.head.body.rotateRight(this.trend * this.rotationSpeed);
    this.tempUpdate();

    // console.log(this.head.body.x, this.head.body.y);
    if(this.scale > scale_before)
        academy.addRewardToAgent(agent, 1.0)
}
