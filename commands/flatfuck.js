module.exports = {
    name: 'flatfuck',
    description: 'Is it flat fuck friday?!',
    execute(message) {
        var day = new Date();
        if(day.getDay() == 4) {
            message.channel.send("IT'S FLAT FUCK FRIDAY YOU FUCKING LOSER :hahagators:");
        }
        else {
            message.channel.send("Sorry no it's not FFF!");
        }
    }
}