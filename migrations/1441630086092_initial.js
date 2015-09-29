exports.up = function(pgm) {
	pgm.createTable('data',
		{
			id: { type: 'bigserial', notNull: true, primaryKey: true },
			time: { type: 'bigint', notNull: true},
			data: { type: 'jsonb'}
		}
	);
};

exports.down = function(pgm) {
		pgm.dropTable('data');
};
