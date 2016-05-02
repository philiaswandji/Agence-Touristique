
angular.module('myApp', ["checklist-model"])
    .controller('TopsitesCtrl',TopsitesCtrl)
    .controller('PreferenceCtrl',PreferenceCtrl)
    .controller('AllSitesCtrl',AllSitesCtrl);

function TopsitesCtrl($scope,$http){
    $http.get("topsites.json").success(function(data){
        $scope.sites=data;
    })
}
function PreferenceCtrl($scope,$http){
    $scope.showresult=false;
    $scope.prefs=[];
    $http.get("preferences.json").success(function (data) {
        $scope.preferences=data;
        data.forEach(function(pref){
            $scope.prefs.push(false);
        })
    });

    $http.get("sites.json").success(function(data){
        $scope.sites=data;
    })
    $scope.choixpref=[];
    $scope.init=function(){
        $scope.choixpref=[];
        $scope.sitespref=[];
        for(var i=0;i<$scope.prefs.length;i++){
            $scope.prefs[i]=false;
        }
        $scope.showresult=false;
    }
    $scope.resoudre=function(){
        console.log("Les sites : ");
        console.log($scope.sites);
        var ResultatFinal = lpsolve($scope.montant,$scope.duree*60,$scope.sites,$scope.preferences,$scope.choixpref,$scope.sitespref);
        $scope.nbtotal = ResultatFinal.obj;
        var results  = ResultatFinal.sites;
        if(results.length>0){
            $scope.hasResult = true;
        }
        else{
            $scope.hasResult = false;
        }
        $scope.resultSites=[];
        results.forEach(function(val){
            $scope.resultSites.push($scope.sites[val]);
        })
        var resultat = calculResult($scope.resultSites);
        $scope.montanttotal = resultat.montant;
        $scope.dureetotale = resultat.duree;
        $scope.showresult=true;
    }
    $scope.sitespref=[];
}
function AllSitesCtrl($scope,$http){
    $scope.allSites = [];
    $http.get("sites.json").success(function(data){
        angular.forEach(data,function(value,key){
            $scope.allSites.push(value);
        })
    })
}
function calculResult(sites){
    var resultat = {
        montant:0,
        duree: 0.0
    };
    sites.forEach(function(site){
        resultat.montant+=site.Tarif;
        resultat.duree+=site.Duree;
    })
    resultat.duree/=60;
    return resultat;
}

function lpsolve(m,t,sites,preferencestab,preferenceschoisies,siteschoisis){
    console.log(sites);
    console.log(preferencestab);
    console.log(preferenceschoisies);
    console.log(siteschoisis);
    var texte="Maximize\n";
    var obj="obj: ";//x1+x2+x3+x4+x5+x6+x7+x8+x9+x10+x11+x12+x13"
    var subject = "Subject To \n";
    var subject1 = ""; //Contrainte sur le temps
    var subject2 = ""; //Contrainte sur le beefton
    var tpreferences = ""; //Les preferences;
    var bounds="Bounds \n";
    var general="General \n";
    angular.forEach(sites,function(valeur,cle){
        obj+="+"+cle+" ";
        subject1+="+"+valeur.Duree+""+cle+" ";
        subject2+="+"+valeur.Tarif+""+cle+" ";
        bounds+=cle+"<=1\n";
        general+=cle+" ";
    })
    obj+="\n";
    bounds+="\n";
    general+="\n";
    texte+=obj;
    preferenceschoisies.forEach(function(val){
        if(val>0){
            tpreferences+=preferencestab[val].formul;
        }
        else{
            siteschoisis.forEach(function(site){
                tpreferences+=""+site+"=1\n";
            })
        }
    });
    subject1+="<="+t+"\n";
    subject2+="<="+m+"\n";
    subject+=subject1;
    subject+=subject2;
    subject+=tpreferences;
    texte+=subject;
    texte+=bounds;
    texte+=general;
    texte+="End\n";
    console.log(texte);

    //Traitement proprement dit
    var lp = glp_create_prob();
    glp_read_lp_from_string(lp, null, texte);
    glp_scale_prob(lp, GLP_SF_AUTO);

    var smcp = new SMCP({presolve: GLP_ON});
    glp_simplex(lp, smcp);

    var iocp = new IOCP({presolve: GLP_ON});
    glp_intopt(lp, iocp);

    var nbreSites = glp_mip_obj_val(lp);
    var resultSites = [];
    for(var k = 1; k <= glp_get_num_cols(lp); k++){
        if(glp_mip_col_val(lp, k)==1){
            resultSites.push(glp_get_col_name(lp, k));
        }
    }
    var resultat = {
        obj:nbreSites,
        sites:resultSites
    };
    return resultat;
}