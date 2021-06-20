const db = require('../db/models');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const { runTerminalCommand, kubectl, gcloud, serviceAccount } = require('../../terminalCommands');
const secret = 'ohana';

let configFile = '/Users/fenris/Desktop/Codesmith/klustr.dev/yamlConfigs/UserAccount.yaml';

const userController = {};

// userController.bcryptEmail = (req, res, next) => {
//   console.log('req', req);
//   const { email } = req.body;
//   bcrypt.hash(email, saltRounds)
//     .then((hash) => {
//       res.locals.email = hash;
//       return next();
//     })
//     .catch((err) => next({ log: `Error in userController.bcrypt: ${err}` }));
// }

userController.bcryptPassword = (req, res, next) => {
  const { password } = req.body;
  bcrypt.hash(password, saltRounds)
    .then((hash) => {
      res.locals.password = hash;
      return next();
    })
    .catch((err) => next({ log: `Error in userController.bcrypt: ${err}` }));
}

userController.addNewUser = (req, res, next) => {
  console.log('hitting addNewUser controller')
  const { password } = res.locals;
  const { email, firstName, lastName, teamId, isAdmin, editAccess } = req.body;
  const params = [email, password, firstName, lastName, isAdmin, teamId, editAccess];
  const query = `
  INSERT INTO users(email, password, first_name, last_name, is_admin, team_id, edit_access)
  VALUES ($1, $2, $3, $4, $5, $6, $7);`
  db.query(query, params)
    .then(() => next())
    .catch((err) => {
      return next({ log: `Error in userController.addNewUser: ${err}` });
    })
}

// userController.addNewUser = (req, res, next) => {
//   const { password } = res.locals;
//   const { email, firstName, lastName, teamId, isAdmin, editAccess } = req.body;
//   const params = [email, password, firstName, lastName, isAdmin, teamId, editAccess];
//   const query = `
//   INSERT INTO users(email, password, first_name, last_name, is_admin, team_id, edit_access)
//   VALUES ($1, $2, $3, $4, $5, $6, $7);`
//   db.query(query, params)
//     .then(() => next())
//     .catch((err) => {
//       return next({ log: `Error in userController.addNewUser: ${err}` });
//     })
// }

// new
userController.createServiceAccount = (req, res, next) => {
  const { email } = req.body
  // run terminal command for service account
  runTerminalCommand(serviceAccount.user(email))
  .then((data) => {
    console.log('what is data', data)
    runTerminalCommand(serviceAccount.userConfig(email))
    return next();
    })
  .catch((err) => {
    return next({ log: `Error in userController.editAccessUser: ${err}` });
    })
  }

// create tenancy with the useraccount.yaml
// userController.createTenancy = (req, res, next) => {
//   const { editAccess } = req.body
//   runTerminalCommand(kubectl.currentContext())
//   .then((data) => {
//     const clusterName = data.split('_').slice(-1).toString().trim();
//     runTerminalCommand(gcloud.getCredentials(clusterName))
//   .then((data) => {
//     if (editAccess === 'true') {
//       // need to create config files automatically
//       runTerminalCommand(kubectl.createFromConfig(configFile))
//       return next();
//     } else {
//       runTerminalCommand(kubectl.createFromConfig(configFile))
//       return next();
//     }
//   })
//   .catch((err) => {
//     return next({ log: `Error in userController.editAccessUser: ${err}` });
//     })
//   })
// }


// userController.editAccessUser = (req, res, next) => {
//   const { editAccess } = req.body
//   runTerminalCommand(kubectl.currentContext())
//   .then((data) => {
//     const clusterName = data.split('_').slice(-1).toString().trim();
//     runTerminalCommand(gcloud.getCredentials(clusterName))
//   .then((data) => {
//     if (editAccess === 'true') {
//       // need to create config files automatically
//       runTerminalCommand(kubectl.createFromConfig(configFile))
//       return next();
//     } else {
//       runTerminalCommand(kubectl.createFromConfig(configFile))
//       return next();
//     }
//   })
//   .catch((err) => {
//     return next({ log: `Error in userController.editAccessUser: ${err}` });
//     })
//   })
// }

userController.loginCheck = (req, res, next) => {
  const { email, password } = req.body;
  const query = `
    SELECT password
    FROM users
    WHERE email = '${email}'
  `
  db.query(query)
    .then((result) => {
      bcrypt.compare(password, result.rows[0].password, (err, result) => {
        if (err) return next({ log: `Error in userController.loginCheck: ${err}` });
        if (!result) return next({ log: 'Incorrect username/password', message: 'Incorrect username/password' });
        return next();
      })
    })
    .catch((err) => next({ log: `Error in userController.loginCheck: ${err}`, message: 'Incorrect username/password' }))
};

userController.isAdminCheck = (req, res, next) => {
  const { email } = req.body;
  const params = [email];
  const query = `
  SELECT is_admin
  FROM users
  WHERE email=$1;
  `
  db.query(query, params)
    .then(result => {
      let isAdminResult = result.rows[0].is_admin;
      if (!isAdminResult) isAdminResult = false;
      res.locals.isAdminResult = isAdminResult;
      return next();
    }).catch(err => next({ log: `Error in userController.isAdminCheck: ${err}` }))
}

userController.verifyAdmin = (req, res, next) => {
  const { token } = req.body;
  jwt.verify(token, secret, (err, decoded) => {
    if (err) return next({ log: `Error in userController.verifyAdmin: ${err}` });
    res.locals.isAdmin = decoded.isAdmin;
    return next();
  })
}

userController.assignJwt = (req, res, next) => {
  const { isAdminResult } = res.locals;
  const { email, firstName, lastName } = req.body;
  jwt.sign({ email, firstName, lastName, isAdmin: isAdminResult }, secret, (err, token) => {
    if (err) return next({ log: `Error in userController.assignJwt: ${err}` })
    res.locals.token = token;
    return next();
  })
}

module.exports = userController;