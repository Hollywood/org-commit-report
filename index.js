require('dotenv').config()
const fs = require('fs')
const path = require('path')
const Json2csvParser = require('json2csv').Parser;
const github = require('@octokit/rest')({
    headers: {
        accept: 'application/vnd.github.hellcat-preview+json'
    },
    //Set this to GHE API url if on GitHub Enterprise
    baseUrl: 'https://api.github.com'
})
require('./pagination')(github)

//Add a PAT to the .env file to authenticate against the instance.
github.authenticate({
    type: 'token',
    token: process.env.ghToken
})

function checkForCommits(commit) {
    return commit > 0
}

async function getRepoData() {
    var table = []


    //Get List of Repos and their sizes
    const repoResponse = [].concat.apply([], 
        (await github.paginate(github.repos.list())).map(n => n.data.map((n) => [n.name , n.owner.login])))
    
    //Date to process commits from
    const commitDate = new Date((new Date()).setUTCHours(0,0,0,0)).toISOString()
    
    //List all commits for the repositories contained in the org
    for(const repository of repoResponse){
        const commitCount = await github.repos.getParticipationStats({owner: repository[1], repo: repository[0]})
        
            const repoParams = Object.assign({}, { owner: repository[1], repo: repository[0]} || {} )

            const pages = await github.paginate(github.repos.listCommits(repoParams))

            const mapped = pages.map(items => items.data
            .map((n) => [
                n.url,
                n.commit.tree.sha,
                n.author.login,
                n.commit.author.date
            ]))

            const commits = [].concat.apply([], mapped)
            
            commits.forEach(commit => {
                table.push({
                    repo: repository[0],
                    org: repository[1],
                    committer: commit[2],
                    url: commit[0],
                    sha: commit[1],
                    date: commit[3]
                })
            })
    }
        
    //Write to CSV file
    const fields = ['repo', 'org', 'committer', 'date', 'url', 'sha']
    var json2csvParser = new Json2csvParser({
      fields,
      delimiter: ';'
    })
    const csv = json2csvParser.parse(table)
    console.log(csv)
    fs.writeFile('org-commits.csv', csv, function (err) {
      if (err) throw err
      console.log('file saved!')
    })
}


getRepoData()
