#!/bin/bash
#
# Chai PCR - Software platform for Open qPCR and Chai's Real-Time PCR instruments.
# For more information visit http://www.chaibio.com
#
# Copyright 2016 Chai Biotechnologies Inc. <info@chaibio.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

if ! id | grep -q root; then
	echo "must be run as root"
	exit 1
fi

temp="/tmp/image_creator"
eMMC=/dev/md2

boot_partition=${eMMC}p1
rootfs_partition=${eMMC}p2

data_partition=${eMMC}p3
perm_partition=${eMMC}p4

#tooling
loopdev=/dev/loop2
mdsumtool=md5sum

mdsumdir=$(which $mdsumtool)
echo md5dir : $mdsumdir

mdadmtool=mdadm
mdadmdir=$(which $mdadmtool)

if [ -z "$mdadmdir" ]
then
	echo $mdadmtool not found.
	apt-get -y install mdadm
else
	echo mdadm tool dir: $mdadmdir
fi

mdsumdir=$(which $mdsumtool)
echo "md5dir: $mdsumdir"

if [ -z "$mdsumdir" ]
then
	echo "$mdsumtool not found (2)."
	mdsumtool='md5 -r'
	mdsumdir=$(which $mdsumtool)
	echo tool: $mdsumdir
	if [ -z "$mdsumdir" ]
	then
		echo "can't find md5sum"
		exit 1
	else
		echo using md5 instead of md5sum
	fi
else
	echo $mdsumtool found.
fi

mkfsext4tooldir=$(which mkfs.ext4)
echo mkfs.ext4 : $mkfsext4tooldir

if [ ! -z "$mkfsext4tooldir" ]
then
	echo mkfs.ext4 found at $mkfsext4tooldir
else
	echo mkfs.ext4 not found. Looking for its port..
	mkfsext4tooldir=$(brew --prefix e2fsprogs)/sbin/mkfs.ext4
	echo looking for $mkfsext4tooldir
	if [ -e "$mkfsext4tooldir" ]
	then
        	echo mkfs.ext4 found at $mkfsext4tooldir
      	else
		echo "mkfs.ext4 port is not installed.. installing mkfs.ext4 port.."
		chown -R root /usr/local/bin/brew
		brew install e2fsprogs

		#echo mkfs tools installed.

		if [ -e "$mkfsext4tooldir" ]
       		then
                	echo mkfs.ext4 installed to $mkfsext4tooldir
        	else
     	           	echo "Failed installing mkfs.ext4 port.."
                	exit 1
        	fi
	fi
fi

sdcard="."
current_folder=$(pwd)
output_dir=$current_folder
BASEDIR=$(dirname $0)

echo "current dir $current_folder"

if [ -z $1 ]
then
	sdcard=$current_folder

	if [ -e ${current_folder}/eMMC_part1.img ]
	then
		sdcard=$current_folder
	elif [ -e ${BASEDIR}/eMMC_part1.img ]
        then
                sdcard=$BASEDIR
	fi

	echo "No sdcard path given.. assuming same directory: $sdcard"
else
	if [ -e $1 ]
	then
		echo "Path found: $1"
		sdcard=$1
	else
		echo "Path not found: $1"
		exit 1
	fi
fi

if [ -z $2 ]
then
	echo "No output path given.. assuming current directory: $current_folder"
	output_dir=$current_folder
else
	output_dir=$2
	if [ -e $2 ]
	then
		echo "Path found: $2"
	else
		mkdir -p $2
		if [ -e $2 ]
		then
			echo "Path created: $2"
			BASEDIR=$(dirname $0)
		else
			echo "Cann't create path: $2"
			exit 1
		fi
	fi
fi

if [ ! -e ${output_dir}/p1 ]
then
	mkdir -p ${output_dir}/p1
fi

if [ ! -e ${output_dir}/p2/scripts/ ]
then
	mkdir -p ${output_dir}/p2/scripts/
fi

echo copying card contents from $BASEDIR/factory_settings_sdcard/ to $output_dir/p1
cp -r $BASEDIR/factory_settings_sdcard/* $output_dir/p1
cp $BASEDIR/factory_settings_sdcard/scripts/* $output_dir/p2/scripts/

image_filename_upgrade="${temp}/eMMC.img"
image_filename_upgrade1="$sdcard/eMMC_part1.img"
image_filename_upgrade2="$sdcard/eMMC_part2.img"
upgrade_scripts="scripts"
factory_scripts="factory-scripts"


echo "Packing eMMC image.."
if [ -e  ${temp} ]
then
        echo "$temp: exists!"
else
        mkdir -p ${temp}/$upgrade_scripts
fi

if [ ! -e  ${temp}/$factory_scripts ]
then
        mkdir -p ${temp}/$factory_scripts
fi

unmount_all () {
	if [ -e /dev/md2 ]
	then
		sync
		sleep 2
		fuser -m /dev/md2* --all -u -v -k
		mdadm --stop /dev/md2
	fi
	if [ -e /dev/loop2 ]
	then
		losetup -d /dev/loop2
	fi
	if [[ "$loopdev_tool" =~ "hdiutil" ]]
	then
		echo hdiutil found
		hdiutil detach $loopdev
	else
		echo hdiutil not found
	fi
}

error_exit () {
	echo "Error: $1... Tool will exit!"
	unmount_all
	rm -r $output_dir
	exit 1
}

if cp $BASEDIR/factory_settings_sdcard/scripts/* $temp/$upgrade_scripts
then
	echo scripts copied.
else
	error_exit "Not able to copy factory settings script"
fi

if [ ! -e $image_filename_upgrade1 ]
then
	error_exit "First image part not found: $image_filename_upgrade1"
fi

if [ ! -e $image_filename_upgrade2 ]
then
	error_exit "Second image part not found: $image_filename_upgrade2"
fi

echo "Concatinating eMMC image parts"
cat $image_filename_upgrade1 $image_filename_upgrade2 > $image_filename_upgrade

if [ $? -gt 0 ]
then
	error_exit "Error concatinating image parts!"
fi

echo Extracting partitions...
loopdev_tool=$(which losetup)
if [ -z "$loopdev_tool" ]
then
        loopdev_tool=$(which hdiutil)
        if [ -z "$loopdev_tool" ]
        then
                error_exit "loop device mounting tool not found! Please install hdiutil or losetup."
        else
                # Mac support!
                devname=$(hdiutil attach $image_filename_upgrade | egrep -o '/dev/disk[0-9]+ ')
                devname=${devname%% }
		devname=${devname## }
		echo "Image file mounted.. device: $devname"
                if [ -z "$devname" ]
                then
                        error_exit "Error mounting image file"
                fi

                eMMC=$devname
                boot_partition=${eMMC}s1
                rootfs_partition=${eMMC}s2
                data_partition=${eMMC}s3
                perm_partition=${eMMC}s4
        fi
else
        loopdev=/dev/loop2
        losetup $loopdev $image_filename_upgrade
        if [ $? -gt 0 ]
        then
                error_exit "Error creating a block device for $image_filename_upgrade!"
        fi
        mdadm --build --level=0 --force --raid-devices=1 /dev/md2 /dev/loop2
        if [ $? -gt 0 ]
        then
                error_exit "Error mapping partitions for $image_filename_upgrade!"
        fi
fi

image_filename_folder="${temp}"

image_filename_prfx="upgrade"
image_filename_rootfs="$image_filename_prfx-rootfs.img.gz"

image_upgrade_filename_rootfs="$image_filename_prfx-rootfs2.img.gz"

image_filename_data="$image_filename_prfx-data.img.gz"
image_filename_boot="$image_filename_prfx-boot.img.gz"
image_filename_perm="$image_filename_prfx-perm.img.gz"

image_filename_pt="$image_filename_prfx-pt.img.gz"

checksums_filename="$image_filename_prfx-checksums.txt"

image_filename_upgrade_temp="${temp}/temp.tar"
image_filename_upgrade1="${output_dir}/p2/upgrade.img.tar"

echo "SDCard: $sdcard"
if cd ${temp}
then
	echo directory changed.
else
	error_exit "Cann't switch to ${temp}"
fi

image_filename_upgrade2="${output_dir}/p1/factory_settings.img.tar"

echo "Packing eMMC image.."

echo "Temp folder: $image_filename_folder"
ls $image_filename_folder

if [ -e $image_filename_upgrade_temp ]
then
	rm $image_filename_upgrade_temp
fi

if [ -e $image_filename_upgrade1 ]
then
	rm $image_filename_upgrade1
fi

if [ -e $image_filename_upgrade2 ]
then
	rm $image_filename_upgrade2
fi

echo "Copying eMMC partitions at $eMMC"
sync
echo "Packing partition table from: ${eMMC} to: $image_filename_pt"
if dd  if=${eMMC} bs=16777216 count=1 | gzip -c > $image_filename_pt
then
	echo pt image extracted.
else
	error_exit "Cann't extract pt image!"
fi

echo "Chaibio Checksum File">$checksums_filename
if $mdsumtool $image_filename_pt>>$checksums_filename
then
	echo partition table checksum generatted.
else
	error_exit "partition table checksum generation failed!"
fi

sleep 2
sync

if [ ! -e /tmp/emmc ]
then
	mkdir -p /tmp/emmc
fi

if [ ! -e $rootfs_partition ]
then
        error_exit "Root file system partition not found: $rootfs_partition"
fi

if [ ! -e $data_partition ]
then
        error_exit "Data file system partition not found: $data_partition, backuped eMMC was not 4 partitions."
fi

if mount $rootfs_partition /tmp/emmc -t ext4
then 
	echo $rootfs_partition mounted!
else
        error_exit "mounting $rootfs_partition failed."
fi

echo "Zeroing rootfs partition"
dd if=/dev/zero of=/tmp/emmc/big_zero_file1.bin bs=16777216 > /dev/null 2>&1
result=$?
sync &
sleep 5

sync
echo "Removing zeros file"
rm /tmp/emmc/big_zero_file*
sync &
sleep 10
sync
umount /tmp/emmc > /dev/null || true

echo "Packing binaries partition to: $image_filename_rootfs"
if dd  if=$rootfs_partition bs=16777216 | gzip -c > $image_filename_rootfs
then
	echo rootfs image extracted.
else
	error_exit "Cann't extract rootfs image!"
fi

if $mdsumtool $image_filename_rootfs>>$checksums_filename
then
	echo rootfs partition checksum generatted.
else
	error_exit "rootfs partition checksum generation failed!"
fi


mount $rootfs_partition /tmp/emmc -t ext4
retval=$?

if [ $retval -ne 0 ]; then
    echo "Error mounting rootfs partition. Error($retval)"
else
	echo Disabling unicorn service
	rm /tmp/emmc/etc/rc?.d/???unicorn || :

	sync
	umount /tmp/emmc > /dev/null || true
fi

echo "Packing upgrade rootfs partition to: $image_upgrade_filename_rootfs"
if dd  if=$rootfs_partition bs=16777216 | gzip -c > $image_upgrade_filename_rootfs
then
	echo upgrade rootfs image extracted.
else
	error_exit "Cann't extract upgrade rootfs image!"
fi
if $mdsumtool $image_upgrade_filename_rootfs>>$checksums_filename
then
	echo upgrade rootfs partition checksum generatted.
else
	error_exit "upgrade rootfs partition checksum generation failed!"
fi

sleep 5
sync

echo "Packing perm partition to: $image_filename_perm"
$mkfsext4tooldir $perm_partition -q -L perm -F -F
if dd  if=$perm_partition bs=16777216 | gzip -c > $image_filename_perm
then
	echo perm image extracted.
else
	error_exit "Cann't extract perm image!"
fi
if $mdsumtool $image_filename_perm>>$checksums_filename
then
	echo perm partition checksum generatted.
else
	error_exit "perm partition checksum generation failed!"
fi

echo "Packing boot partition to: $image_filename_boot"
if dd  if=$boot_partition bs=16777216 | gzip -c > $image_filename_boot
then
	echo boot image extracted.
else
	error_exit "Cann't extract boot image!"
fi

if $mdsumtool $image_filename_boot>>$checksums_filename
then
	echo boot partition checksum generatted.
else
	error_exit "boot partition checksum generation failed!"
fi

#create scripts folder inside the tar
if [ ! -e $upgrade_scripts ]
then
	mkdir -p $upgrade_scripts/
	mkdir -p $factory_scripts/
fi

echo "Data partition: $data_partition"
if mount $data_partition /tmp/emmc -t ext4
then
	echo $data_partition mounted!
else
	error_exit "mounting $data_partition failed!"
fi

echo "Zeroing data partition"
dd if=/dev/zero of=/tmp/emmc/big_zero_file.bin > /dev/null 2>&1
sync &
sleep 5
sync
echo "Removing zeros file"
rm /tmp/emmc/big_zero_file.bin
sync &
sleep 10
sync
umount /tmp/emmc > /dev/null || true

echo "Packing data partition to: $image_filename_data"
if dd  if=$data_partition bs=16777216 | gzip -c > $image_filename_data
then
	echo data image extracted.
else
	error_exit "Cann't extract data image!"
fi
if $mdsumtool $image_filename_data>>$checksums_filename
then
	echo data partition checksum generatted.
else
	error_exit "data partition checksum generation failed!"
fi

	#tarring
#	echo "compressing all images to $image_filename_upgrade_tar_temp"
if	tar -cvf $image_filename_upgrade_temp $image_filename_pt $image_filename_boot $image_filename_data $image_filename_rootfs  $image_filename_perm $checksums_filename
then
	echo $image_filename_upgrade_temp generatted.
else
	error_exit "tarring $image_filename_upgrade_temp failed!"
fi

if [ -e $image_filename_data ]
then
	rm $image_filename_data
else
	echo "Data image not found: $image_filename_data"
fi

echo "Finalizing: $image_filename_upgrade2"
if mv $image_filename_upgrade_temp $image_filename_upgrade2
then
	echo $image_filename_upgrade_temp moved to $image_filename_upgrade2
else
	error_exit "moving $image_filename_upgrade_temp to $image_filename_upgrade2 failed!"
fi


if [ -e $image_filename_upgrade_temp ]
then
	rm $image_filename_upgrade_temp
fi

echo Packing upgrade image

rm $image_filename_rootfs
if mv $image_upgrade_filename_rootfs $image_filename_rootfs
then
	echo $image_upgrade_filename_rootfs moved to $image_filename_rootfs
else
	error_exit "moving $image_upgrade_filename_rootfs to $image_filename_rootfs failed!"
fi

echo "packaging factory scripts in upgrade image."
cp -r ${output_dir}/p1/* $temp/$factory_scripts

if tar cvf $image_filename_upgrade_temp $image_filename_pt $image_filename_boot $image_filename_rootfs $image_filename_perm $checksums_filename $upgrade_scripts $factory_scripts --exclude=factory_settings.img.tar
then
	echo $image_filename_upgrade_temp generatted.
else
	error_exit "tarring $image_filename_upgrade_temp failed!"
fi

echo "Remove packed files"
if [ -e $image_filename_boot ]
then
	rm $image_filename_boot
else
       	echo "Boot image not found: $image_filename_boot"
fi

if [ -e $image_filename_rootfs ]
then
	rm $image_filename_rootfs
else
        echo "Rootfs image not found: $image_filename_rootfs"
fi

if [ -e $image_filename_pt ]
then
	rm $image_filename_pt
fi

if cd $current_folder
then
	echo switched to $current_folder
else
	error_exit "switching to $current_folder failed!"
fi

echo "Finalizing: $image_filename_upgrade1"
if mv $image_filename_upgrade_temp $image_filename_upgrade1
then
	echo $image_filename_upgrade_temp moved to $image_filename_upgrade1
else
	error_exit "moving $image_filename_upgrade_temp to $image_filename_upgrade1 failed!"
fi

if [ -e ${sdcard}/pack_resume_autorun.flag ]
then
	rm ${sdcard}/pack_resume_autorun.flag>/dev/null || true
fi

sync
unmount_all
ls -ahl $output_dir/p1 $output_dir/p2

if [ -e $image_filename_upgrade1 ]
then
	echo "Finished.. byebye!"
	exit 0
fi

error_exit "processing failed"