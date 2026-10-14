// Jenkins pipeline: Build -> Test -> Docker Build -> Docker Push -> Deploy (Minikube)
//
// One-time Jenkins setup (see docs/DEVOPS_GUIDE.md):
//   * Credential  id: dockerhub-creds   (Username with password; password = Docker Hub access token)
//   * Jenkins must run as YOUR user so that docker, kubectl and ~/.kube/config (minikube) work.
//   * Edit API_BASE below if the browser reaches the app on a different URL.
//
// Works on Windows (bat) and Linux/macOS (sh).

def SERVICES = ['patient-service', 'doctor-service', 'appointment-service', 'billing-service', 'auth-service']
def IMAGES   = SERVICES + ['frontend']

// Run a shell command on whichever OS the agent is.
def run(String cmd) {
    if (isUnix()) { sh cmd } else { bat cmd }
}

def mvn(String args) {
    if (isUnix()) { sh "chmod +x mvnw && ./mvnw -B ${args}" } else { bat "mvnw.cmd -B ${args}" }
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
    }

    parameters {
        booleanParam(name: 'RUN_TESTS', defaultValue: true,
                     description: 'Run backend tests against a throwaway MySQL container')
        booleanParam(name: 'DEPLOY', defaultValue: true,
                     description: 'Deploy to the local Minikube cluster after pushing images')
    }

    environment {
        // Gives DOCKERHUB_USR and DOCKERHUB_PSW (masked in logs).
        DOCKERHUB  = credentials('dockerhub-creds')
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
        NAMESPACE  = 'hospital'
        // Baked into the frontend bundle. Matches: kubectl port-forward svc/ingress-nginx-controller 8088:80
        API_BASE   = 'http://localhost:8088'
        TEST_DB    = "ci-mysql-${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build & Test - Backend') {
            steps {
                script {
                    if (params.RUN_TESTS) {
                        run("docker run -d --name ${env.TEST_DB} -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=hospital_db -p 3307:3306 mysql:8.4")
                        timeout(time: 3, unit: 'MINUTES') {
                            waitUntil(initialRecurrencePeriod: 3000) {
                                try {
                                    run("docker exec ${env.TEST_DB} mysqladmin ping -h 127.0.0.1 -proot --silent")
                                    return true
                                } catch (e) { return false }
                            }
                        }
                    }
                    try {
                        def branches = [:]
                        SERVICES.each { svc ->
                            branches[svc] = {
                                dir(svc) {
                                    if (params.RUN_TESTS) {
                                        withEnv([
                                            'SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3307/hospital_db',
                                            'SPRING_DATASOURCE_USERNAME=root',
                                            'SPRING_DATASOURCE_PASSWORD=root'
                                        ]) { mvn('clean verify') }
                                    } else {
                                        mvn('clean package -DskipTests')
                                    }
                                }
                            }
                        }
                        parallel branches
                    } finally {
                        if (params.RUN_TESTS) {
                            try { run("docker rm -f ${env.TEST_DB}") } catch (ignored) { }
                        }
                    }
                }
            }
            post {
                always { junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml' }
            }
        }

        stage('Build - Frontend') {
            steps {
                dir('frontend') {
                    script {
                        run('npm ci')
                        run('npm run build')
                    }
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    IMAGES.each { img ->
                        def extra = (img == 'frontend') ? "--build-arg API_BASE=${env.API_BASE} " : ''
                        run("docker build ${extra}-t ${env.DOCKERHUB_USR}/${img}:${env.IMAGE_TAG} ${img}")
                    }
                }
            }
        }

        stage('Docker Push') {
            steps {
                script {
                    // Single-quoted on purpose: Jenkins must not interpolate the secret into the command.
                    if (isUnix()) {
                        sh 'echo "$DOCKERHUB_PSW" | docker login -u "$DOCKERHUB_USR" --password-stdin'
                    } else {
                        bat 'echo %DOCKERHUB_PSW%| docker login -u %DOCKERHUB_USR% --password-stdin'
                    }
                    IMAGES.each { img ->
                        run("docker push ${env.DOCKERHUB_USR}/${img}:${env.IMAGE_TAG}")
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when { expression { return params.DEPLOY } }
            steps {
                script {
                    run('kubectl apply -f k8s/00-namespace.yaml -f k8s/01-config.yaml -f k8s/02-mysql.yaml -f k8s/03-kafka.yaml ' +
                        '-f k8s/10-patient-service.yaml -f k8s/11-doctor-service.yaml -f k8s/12-appointment-service.yaml ' +
                        '-f k8s/13-billing-service.yaml -f k8s/14-auth-service.yaml -f k8s/15-frontend.yaml ' +
                        '-f k8s/local/ingress-nginx.yaml')
                    // Point each Deployment at the image we just pushed (container name == deployment name).
                    IMAGES.each { img ->
                        run("kubectl -n ${env.NAMESPACE} set image deployment/${img} ${img}=${env.DOCKERHUB_USR}/${img}:${env.IMAGE_TAG}")
                    }
                    IMAGES.each { img ->
                        run("kubectl -n ${env.NAMESPACE} rollout status deployment/${img} --timeout=300s")
                    }
                }
            }
        }
    }

    post {
        success { echo "Deployed tag ${env.IMAGE_TAG}. Open the app: kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8088:80  ->  http://localhost:8088" }
        failure { echo 'Pipeline failed - check the stage logs above.' }
        cleanup { script { try { run('docker logout') } catch (ignored) { } } }
    }
}
