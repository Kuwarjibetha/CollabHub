const {nanoid} = require("nanoid");  // package(make a small and unique string) for invite code ke liye
const {Team,TeamMember} = require("../../../models");


// Create a team
async function createTeam(userId, {name}){

    const inviteCode = nanoid(8); // 8 random code 

    const team = await Team.create({  // add new team  
        name,
        inviteCode,
        createdBy:userId
    });


    await TeamMember.create({
        userId,
        teamId: team.id,
        role: "admin"
    });

    return team;
}




// Join 
async function joinTeam(userId,{inviteCode}){
    
    const team = await Team.findOne({ where:{inviteCode}}) // find a team with inviteCode

    if (!team){
        const error = new Error("Invalid invite code");
        error.statusCode = 404;
        throw error;
    }


    const existingMember = await TeamMember.findOne({    // Check user (yeh user pehle se is team ka member to nahi)
        where:{userId, teamId: team.id},
    });

    if(existingMember){
        const error = new Error("You are already a member of this team");
        error.statusCode = 400;
        throw error;
    }

    await TeamMember.create({
        userId, teamId: team.id,
        role: "member",
    });
    return team;
}




//  get my team
async function getMyTeams(userId){

    const memberships = await TeamMember.findAll({
        where:{userId},
        include:[{ model:Team }],
    });

    return memberships.map((m)=>({

        ...m.Team.toJSON(),
        myRole: m.role,
    }));
}



// Leave team

async function leaveTeam(userId, teamId){

    const membership = await TeamMember.findOne({ where: { userId, teamId }});  // check user is available in this team or not?

    if(!membership){
        const error = new Error("You are not a member of this team");
        error.statusCode = 404;
        throw error;
    }

    await membership.destroy();
    return {message: "Left the team successfully"};
}

module.exports = { createTeam, joinTeam, getMyTeams, leaveTeam };