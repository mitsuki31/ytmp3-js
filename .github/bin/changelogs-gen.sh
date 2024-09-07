#!/bin/bash

@parse_args() {
    for arg in "$@"; do
        case "$arg" in
            -n|--dry-run)
                DRY_RUN=1
                FILE=/dev/stdout  # Override to prevent overwriting unexpectedly
                GIT_PRETTY_FMT="\e[95m-\e[0m \e[33m\`%h\`\e[0m : %s \e[96m(%an)\e[0m"
            ;;
            -u|--use-version)
                USE_VERSION=1
                CURRENT_TAG=$(awk -F'"' '/"version":/ {print $4}' "$PROJECT_DIR/package.json")
            ;;
        esac
    done
}

@setup() {
    PROJECT_DIR=$(realpath "$(dirname $0)/../..")
    CURRENT_WORKDIR=$(pwd)
    # Changelog file name
    FILE="$PROJECT_DIR/CHANGELOG.md"

    GO_BACK=0
    # Go to project's root directory
    if test "$CURRENT_WORKDIR" != "$PROJECT_DIR"; then
        cd "$PROJECT_DIR"
        GO_BACK=1
    fi
    
    # Define the latest tag and the current tag
    LATEST_TAG=$(git describe --tags --abbrev=0)
    CURRENT_TAG=$(git describe --tags --abbrev=0 HEAD)
    # Get the repo URL from git remote config
    REPO_URL=$(git config --local --get remote.origin.url)
    GIT_PRETTY_FMT="- [\`%h\`](${REPO_URL}/commit/%H) : %s (%an)"

    # Options
    DRY_RUN=0
    USE_VERSION=0

    @parse_args "$@"

    # Generate the changelogs
    CHANGELOGS=$(git log $LATEST_TAG..HEAD  \
        --first-parent                      \
        --pretty=format:"$GIT_PRETTY_FMT"   \
            | grep -E ': (ci(\(|:)|chore\(version(-dev)?\))' --invert-match)
    OLD_CHANGELOGS=$(cat CHANGELOG.md 2> /dev/null)  # Get the old changelogs if available
}

@done() {
    # Move back to previous working directory
    test $GO_BACK -eq 1 && cd "$CURRENT_WORKDIR"
    exit 0
}

@main() {
    # Get the current date in "Month Day, Year" format
    local current_date=$(date +"%B %d, %Y")

    @setup "$@"
    if test $DRY_RUN -eq 1; then
        echo -e "\e[1;93m> \e[0mDry run \e[92menabled\e[0m\n"
        echo -e "\e[1m## $CURRENT_TAG - $current_date\n\n\e[0m$CHANGELOGS"
        @done
    fi

    # Add a header with the version and date
    echo -e "## $CURRENT_TAG - $current_date\n\n$CHANGELOGS" > "$FILE"

    # Write the old changelogs, if not empty
    if ! test -z "$OLD_CHANGELOGS"; then
        echo -e "\n\n$OLD_CHANGELOGS" >> "$FILE"
    fi

    @done
}

@main "$@"

unset @setup @parse_args @main @done
unset DRY_RUN USE_VERSION GO_BACK
unset PROJECT_DIR CURRENT_WORKDIR REPO_URL FILE GIT_PRETTY_FMT
unset CHANGELOGS OLD_CHANGELOGS CURRENT_TAG LATEST_TAG
