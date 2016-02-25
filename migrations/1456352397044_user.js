exports.up = function (pgm) {
  //pgm.addColumns('data', {'user': {type: 'character varying(50)'}});
  //pgm.addColumns('pellets', {'user': {type: 'character varying(50)'}});


  pgm.sql('ALTER TABLE data ADD COLUMN "usern" character varying(50)');
  pgm.sql('ALTER TABLE pellets ADD COLUMN "usern" character varying(50)');
};

exports.down = function (pgm) {
  pgm.sql('ALTER TABLE data DROP COLUMN "usern"');
  pgm.sql('ALTER TABLE pellets DROP COLUMN "usern"');
};
