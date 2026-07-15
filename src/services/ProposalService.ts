import * as vscode from "vscode";

import { ProjectProposal, ProposalStatus } from "../models/Proposal";

import { ProjectStore } from "../storage/projectStore";

import { HistoryEntry } from "../models/History";





export class ProposalService {




	private store:ProjectStore;





	constructor(){


		this.store =

		new ProjectStore();


	}









	load():ProjectProposal[]{



		return this.store.loadProposals();



	}









	add(

		proposal:ProjectProposal

	){



		const proposals =

		this.load();





		proposals.push(

			proposal

		);





		this.store.saveProposals(

			proposals

		);



	}









	getForModule(

		moduleId:string

	):ProjectProposal[]{



		return this.load()

		.filter(

			p =>

			p.moduleId === moduleId

		);



	}









	async updateStatus(

		id:string,

		status:ProposalStatus

	){



		const proposals =

		this.load();





		const proposal =

		proposals.find(

			p =>

			p.id === id

		);







		if(!proposal){


			return;


		}







		proposal.status = status;



		proposal.updatedAt =

		new Date()

		.toISOString();







		this.store.saveProposals(

			proposals

		);








		const history:HistoryEntry = {



			id:

			Date.now()

			.toString(),





			action:

			"UPDATE",





			target:

			proposal.moduleId,





			description:



			`Proposal "${proposal.title}" changed status to ${status}`,





			timestamp:

			new Date()

			.toISOString()




		};







		this.store.addHistory(

			history

		);






	}





}