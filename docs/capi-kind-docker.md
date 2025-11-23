# Kubernetes Cluster API Setup and Management - Complete Documentation

## Overview
This documentation covers the complete process of setting up and experimenting with **Kubernetes Cluster API (CAPI)** using Kind (Kubernetes in Docker) to create and manage Kubernetes clusters declaratively. This workflow demonstrates Infrastructure as Code patterns for Kubernetes cluster management.

## Tools and Components

### 1. **Cluster API (clusterctl) Installation**
```bash
# Download and install clusterctl v1.11.3
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.11.3/clusterctl-linux-amd64 -o clusterctl
sudo mv clusterctl /usr/local/bin/
sudo chmod +x /usr/local/bin/clusterctl
clusterctl version
```

**Purpose**: Cluster API provides declarative APIs and tooling to simplify provisioning, upgrading, and operating multiple Kubernetes clusters. The `clusterctl` command-line tool manages cluster lifecycle operations.

### 2. **Kind (Kubernetes in Docker) Setup**
```bash
# Install Kind v0.30.0
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.30.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/

# Create management cluster
kind create cluster --name management --config ./kind-cluster.yaml
```

**Purpose**: Kind creates local Kubernetes clusters using Docker containers, used here to create a **management cluster** that provisions other clusters.

## Complete Workflow

### Phase 1: Environment Setup
1. Downloaded and installed `clusterctl`
2. Installed Kind for local cluster management
3. Created directory structure for course materials
4. Set up a management cluster using Kind

### Phase 2: Cluster API Initialization
```bash
export CLUSTER_TOPOLOGY=true
clusterctl init --infrastructure=docker
```

- **CLUSTER_TOPOLOGY=true**: Enables the ClusterClass feature for structured cluster definitions
- **--infrastructure=docker**: Uses Docker provider for Cluster API (creates clusters using Kind)

### Phase 3: Workload Cluster Provisioning
```bash
# Generate and deploy workload cluster
clusterctl generate cluster capi-development --flavor=development \
  --kubernetes-version=v1.34.0 \
  --control-plane-machine-count=1 \
  --worker-machine-count=1 | kubectl apply -f -

# Monitor provisioning status
clusterctl describe cluster capi-development
```

### Phase 4: Network Configuration
```bash
# Export kubeconfig for the new cluster
kind get kubeconfig --name capi-development > /tmp/kubeconfig

# Apply Calico CNI for networking
k --kubeconfig /tmp/kubeconfig apply -f ./calico.yaml

# Verify node status (wait for nodes to become Ready)
k --kubeconfig /tmp/kubeconfig get no
```

**Calico CNI**: Provides networking and network policy enforcement, essential for pod-to-pod communication.

### Phase 5: Cluster Testing
```bash
# Test pod execution capability
k --kubeconfig /tmp/kubeconfig run --rm --stdin --image=hello-world --restart=Never test-pod
```

### Phase 6: Cleanup Process
```bash
# Delete workload cluster using Cluster API
k delete cluster capi-development

# Verify cluster deletion
k get cluster

# Check remaining namespaces (Cluster API components persist)
k get ns

# Delete the management cluster
kind delete cluster --name=management
```

## Architecture Summary

```
[Kind Management Cluster]
    │
    ├── Cluster API Controllers
    │   ├── capi-system (core)
    │   ├── capd-system (Docker provider)
    │   ├── capi-kubeadm-bootstrap-system
    │   └── capi-kubeadm-control-plane-system
    │
    └── Provisions → [Workload Cluster: capi-development]
                            │
                            ├── Calico CNI
                            └── Application workloads
```

## Key Concepts Demonstrated

### Infrastructure as Code
- Cluster definitions are declarative YAML manifests
- Entire cluster lifecycle managed through code
- GitOps-ready configurations

### Multi-cluster Management
- **Management Cluster**: Runs Cluster API controllers and manages lifecycle
- **Workload Cluster**: The actual cluster where applications run
- Clear separation of concerns between management and workload planes

### Day 2 Operations
- Network configuration (CNI installation)
- Cluster validation and testing
- Proper cleanup procedures

### Important Observations

#### Cluster API Component Persistence
After deleting workload clusters, Cluster API management components remain running:
- `capd-system` - Cluster API Docker provider
- `capi-kubeadm-bootstrap-system` - Kubeadm bootstrap components  
- `capi-kubeadm-control-plane-system` - Control plane management
- `capi-system` - Core Cluster API components
- `cert-manager` - Certificate management

This demonstrates:
- **Separation of concerns**: Management components are independent of managed clusters
- **Reusability**: Same management cluster can provision multiple workload clusters
- **Persistent control plane**: Management infrastructure remains for future operations

#### Proper Cleanup Sequence
1. **First**: Delete workload clusters through Cluster API (`k delete cluster`)
2. **Then**: Delete management cluster through Kind (`kind delete cluster`)
3. This ensures proper resource cleanup following abstraction layers

## Prerequisites
- Docker installed and running
- kubectl available
- Sufficient system resources for running multiple Kubernetes clusters

## Use Cases
- Local Kubernetes development and testing
- Learning Cluster API concepts
- Infrastructure as Code practices
- Multi-cluster management patterns
- CI/CD pipeline development for cluster provisioning

This complete workflow demonstrates modern Kubernetes cluster management where clusters are treated as disposable resources that can be created, configured, and destroyed programmatically, enabling true Infrastructure as Code for Kubernetes infrastructure.
