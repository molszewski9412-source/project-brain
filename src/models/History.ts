export interface HistoryEntry {


	id:string;


	action:

	"CREATE"
	|
	"UPDATE"
	|
	"DELETE"
	|
	"LOCK";


	target:string;


	description:string;


	timestamp:string;


}